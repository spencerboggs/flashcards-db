import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPaths } from "../src/config.ts";
import { build, validate } from "../src/pipeline/build.ts";
import { assemble, BuildError } from "../src/pipeline/assemble.ts";

const CONFIG = {
  name: "CS Flashcards",
  description: "Test dataset.",
  datasetVersion: "0.1.0",
  schemaVersion: "1.0.0",
  repository: "example/flashcards-db",
  defaultBranch: "main",
  license: { code: "MIT", data: "original", notes: "Test." },
};

const CATEGORIES = `
categories:
  - id: security
    name: Security
    summary: How a system stays confidential, intact, and available.
  - id: cryptography
    name: Cryptography
    parent: security
    summary: How information is hidden, authenticated, and checked for tampering.
  - id: data-structures
    name: Data Structures
    summary: Ways of organizing data so it can be stored and retrieved efficiently.
`;

const CARDS = `
cards:
  - id: binary-tree
    term: Binary Tree
    difficulty: fundamental
    definition: A tree in which each node has at most two children, used as the shape for search trees and heaps.
    categories: [data-structures]
  - id: hash-table
    term: Hash Table
    aliases: ["Hash Map", hashmap]
    difficulty: fundamental
    definition: A collection that stores values under keys and finds a key by running it through a hash function.
    categories: [data-structures]
  - id: tls
    term: TLS
    difficulty: intermediate
    definition: A protocol that authenticates a server and encrypts the bytes of a connection, most often under HTTPS.
    categories: [cryptography]
`;

const RELATIONSHIPS = `
relationships:
  - from: hash-table
    type: contrasts
    to: tls
`;

function workspace(files: { cards?: string; categories?: string; relationships?: string }) {
  const root = mkdtempSync(join(tmpdir(), "flashcards-db-"));
  writeFileSync(join(root, "dataset.config.json"), JSON.stringify(CONFIG));
  const seeds = join(root, "data", "seeds");
  mkdirSync(seeds, { recursive: true });
  writeFileSync(join(seeds, "cards.yaml"), files.cards ?? "cards: []\n");
  writeFileSync(join(seeds, "categories.yaml"), files.categories ?? "categories: []\n");
  writeFileSync(join(seeds, "relationships.yaml"), files.relationships ?? "relationships: []\n");
  return createPaths(root);
}

describe("build", () => {
  it("publishes cards, rolls child categories into the parent, and keeps generatedAt", () => {
    const paths = workspace({ cards: CARDS, categories: CATEGORIES, relationships: RELATIONSHIPS });
    build(paths, "2026-10-08T00:00:00.000Z");
    build(paths, "2026-10-09T00:00:00.000Z");

    const cards = JSON.parse(readFileSync(join(paths.latest, "cards.json"), "utf8"));
    const manifest = JSON.parse(readFileSync(join(paths.latest, "manifest.json"), "utf8"));
    const security = JSON.parse(readFileSync(join(paths.latest, "by-category", "security.json"), "utf8"));
    const cryptography = JSON.parse(readFileSync(join(paths.latest, "by-category", "cryptography.json"), "utf8"));
    const hashTable = JSON.parse(readFileSync(join(paths.latest, "entities", "cards", "hash-table.json"), "utf8"));

    expect(cards.map((card: { id: string }) => card.id)).toEqual(["binary-tree", "hash-table", "tls"]);
    expect(hashTable.aliases).toEqual(["Hash Map"]);
    expect(security).toEqual(["tls"]);
    expect(cryptography).toEqual(["tls"]);
    expect(manifest.generatedAt).toBe("2026-10-08T00:00:00.000Z");
    expect(manifest.repository).toBe("https://github.com/example/flashcards-db");
    expect(manifest.urls.latest).toBe("https://raw.githubusercontent.com/example/flashcards-db/main/data/latest/");
    expect(manifest.counts).toEqual({ cards: 3, categories: 3, relationships: 1 });
    expect(validate(paths, true, "2026-11-01T00:00:00.000Z")).toEqual([]);
  });

  it("rejects an unknown category and a reversed symmetric link", () => {
    const unknown = workspace({
      categories: CATEGORIES,
      cards: `
cards:
  - id: queue
    term: Queue
    difficulty: fundamental
    definition: A sequence that removes items from the front and adds items at the back.
    categories: [algorithms]
`,
    });
    expect(() => assemble(unknown)).toThrow(BuildError);

    const reversed = workspace({
      categories: CATEGORIES,
      cards: CARDS,
      relationships: `
relationships:
  - from: tls
    type: contrasts
    to: hash-table
`,
    });
    expect(() => assemble(reversed)).toThrow(/earlier id first/);
  });

  it("reports a hand-edit of data/latest", () => {
    const paths = workspace({ cards: CARDS, categories: CATEGORIES, relationships: RELATIONSHIPS });
    build(paths, "2026-10-08T00:00:00.000Z");
    writeFileSync(join(paths.latest, "cards.json"), "[]\n");
    expect(validate(paths, true).length).toBeGreaterThan(0);
  });
});
