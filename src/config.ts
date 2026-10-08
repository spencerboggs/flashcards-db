import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { parseWith, readJson } from "./lib/io.ts";

export const DatasetConfig = z.object({
  name: z.string(),
  description: z.string(),
  datasetVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  defaultBranch: z.string().default("main"),
  license: z.object({
    code: z.string(),
    data: z.string(),
    notes: z.string(),
  }),
});
export type DatasetConfig = z.infer<typeof DatasetConfig>;

export const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function createPaths(root: string = REPO_ROOT) {
  const data = join(root, "data");
  return {
    root,
    config: join(root, "dataset.config.json"),
    seeds: {
      cards: join(data, "seeds", "cards.yaml"),
      categories: join(data, "seeds", "categories.yaml"),
      relationships: join(data, "seeds", "relationships.yaml"),
    },
    latest: join(data, "latest"),
  };
}
export type Paths = ReturnType<typeof createPaths>;

export function loadConfig(paths: Paths): DatasetConfig {
  return parseWith(DatasetConfig, readJson(paths.config), paths.config);
}

export function repoUrls(config: DatasetConfig) {
  const base = `https://raw.githubusercontent.com/${config.repository}`;
  return {
    latest: `${base}/${config.defaultBranch}/data/latest/`,
    pinned: `${base}/v${config.datasetVersion}/data/latest/`,
    releases: `https://github.com/${config.repository}/releases`,
  };
}
