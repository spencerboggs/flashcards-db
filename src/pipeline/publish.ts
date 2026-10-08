import { relative, join, sep } from "node:path";
import { unlinkSync } from "node:fs";
import { repoUrls, type DatasetConfig } from "../config.ts";
import { sha256, stableStringify } from "../lib/hash.ts";
import { exists, listFiles, readText, toJson, writeText } from "../lib/io.ts";
import { cardsAtDifficulty, cardsInCategory, type Dataset } from "./assemble.ts";
import { jsonSchemas } from "../schema/json-schema.ts";
import { Manifest, type PublishedCard } from "../schema/published.ts";
import { DIFFICULTIES } from "../schema/seeds.ts";

export type FileMap = Map<string, string>;

function compact(card: PublishedCard) {
  return {
    id: card.id,
    term: card.term,
    aliases: card.aliases,
    difficulty: card.difficulty,
    categories: card.categories,
  };
}

function previousGeneratedAt(latestDir: string, contentHash: string, now: string): string {
  const manifestPath = join(latestDir, "manifest.json");
  if (!exists(manifestPath)) return now;
  try {
    const previous = JSON.parse(readText(manifestPath)) as { contentHash?: unknown; generatedAt?: unknown };
    if (previous.contentHash === contentHash && typeof previous.generatedAt === "string") return previous.generatedAt;
    return now;
  } catch {
    return now;
  }
}

export function renderDataset(dataset: Dataset, config: DatasetConfig, latestDir: string, now: string): FileMap {
  const files: FileMap = new Map();
  files.set("cards.json", toJson(dataset.cards));
  files.set("compact/cards.json", toJson(dataset.cards.map(compact)));
  files.set("categories.json", toJson(dataset.categories));
  files.set("relationships.json", toJson(dataset.relationships));

  const index = [
    ...dataset.categories.map((category) => ({ id: category.id, type: "category" as const, name: category.name })),
    ...dataset.cards.map((card) => ({ id: card.id, type: "card" as const, name: card.term })),
  ].sort((a, b) => (a.type === b.type ? (a.id < b.id ? -1 : 1) : a.type < b.type ? -1 : 1));
  files.set("index.json", toJson(index));

  for (const category of dataset.categories) {
    files.set(`by-category/${category.id}.json`, toJson(cardsInCategory(dataset, category.id)));
  }
  for (const difficulty of DIFFICULTIES) {
    files.set(`by-difficulty/${difficulty}.json`, toJson(cardsAtDifficulty(dataset, difficulty)));
  }
  for (const card of dataset.cards) {
    files.set(`entities/cards/${card.id}.json`, toJson(card));
  }
  for (const [name, schema] of Object.entries(jsonSchemas)) {
    files.set(`schema/${name}`, toJson(schema));
  }

  const contentHash = sha256(stableStringify({
    cards: dataset.cards,
    categories: dataset.categories,
    relationships: dataset.relationships,
  }));
  const checksums: Record<string, { sha256: string; bytes: number }> = {};
  for (const path of [...files.keys()].sort()) {
    const content = files.get(path)!;
    checksums[path] = { sha256: sha256(content), bytes: Buffer.byteLength(content) };
  }

  const difficulty = {
    fundamental: cardsAtDifficulty(dataset, "fundamental").length,
    intermediate: cardsAtDifficulty(dataset, "intermediate").length,
    advanced: cardsAtDifficulty(dataset, "advanced").length,
  };
  const manifest = {
    name: config.name,
    description: config.description,
    datasetVersion: config.datasetVersion,
    schemaVersion: config.schemaVersion,
    generatedAt: previousGeneratedAt(latestDir, contentHash, now),
    contentHash,
    repository: `https://github.com/${config.repository}`,
    license: config.license,
    counts: {
      cards: dataset.cards.length,
      categories: dataset.categories.length,
      relationships: dataset.relationships.length,
    },
    difficulty,
    files: {
      cards: "cards.json",
      compact: "compact/cards.json",
      categories: "categories.json",
      relationships: "relationships.json",
      index: "index.json",
    },
    checksums,
    sources: [
      {
        id: "original",
        note: "Card text is written for this database.",
      },
    ],
    urls: repoUrls(config),
  };
  Manifest.parse(manifest);
  files.set("manifest.json", toJson(manifest));
  return files;
}

export function writeFileMap(dir: string, files: FileMap): { written: string[]; deleted: string[] } {
  const written: string[] = [];
  for (const [path, content] of files) if (writeText(join(dir, path), content)) written.push(path);
  const deleted: string[] = [];
  for (const file of listFiles(dir)) {
    const rel = relative(dir, file).split(sep).join("/");
    if (!files.has(rel)) {
      unlinkSync(file);
      deleted.push(rel);
    }
  }
  return { written, deleted };
}

export function diffFileMap(dir: string, files: FileMap): string[] {
  const differences: string[] = [];
  for (const [path, content] of files) {
    const full = join(dir, path);
    if (!exists(full) || readText(full) !== content) differences.push(path);
  }
  for (const file of listFiles(dir)) {
    const rel = relative(dir, file).split(sep).join("/");
    if (!files.has(rel)) differences.push(rel);
  }
  return differences.sort();
}
