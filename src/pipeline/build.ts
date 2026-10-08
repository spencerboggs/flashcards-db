import type { Paths } from "../config.ts";
import { loadConfig } from "../config.ts";
import { SourceFileError } from "../lib/io.ts";
import { assemble, BuildError } from "./assemble.ts";
import { diffFileMap, renderDataset, writeFileMap } from "./publish.ts";

export interface BuildResult {
  cards: number;
  categories: number;
  relationships: number;
  written: string[];
  deleted: string[];
}

export function build(paths: Paths, now: string = new Date().toISOString()): BuildResult {
  const config = loadConfig(paths);
  const dataset = assemble(paths);
  const files = renderDataset(dataset, config, paths.latest, now);
  const { written, deleted } = writeFileMap(paths.latest, files);
  return {
    cards: dataset.cards.length,
    categories: dataset.categories.length,
    relationships: dataset.relationships.length,
    written,
    deleted,
  };
}

export function validate(paths: Paths, checkOutput: boolean, now: string = new Date().toISOString()): string[] {
  const errors: string[] = [];
  try {
    const config = loadConfig(paths);
    const dataset = assemble(paths);
    if (checkOutput) {
      const files = renderDataset(dataset, config, paths.latest, now);
      for (const path of diffFileMap(paths.latest, files)) errors.push(`data/latest is out of date: ${path}`);
    }
  } catch (error) {
    if (error instanceof BuildError) errors.push(...error.errors);
    else if (error instanceof SourceFileError) errors.push(error.message);
    else throw error;
  }
  return errors;
}
