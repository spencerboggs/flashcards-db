import { z } from "zod";
import { Complexity, Difficulty, EntityId, RelationshipType } from "./seeds.ts";

export const PublishedCard = z.object({
  id: EntityId,
  term: z.string(),
  aliases: z.array(z.string()),
  prompt: z.string().optional(),
  difficulty: Difficulty,
  definition: z.string(),
  purpose: z.string().optional(),
  details: z.array(z.string()).optional(),
  complexity: Complexity.optional(),
  examples: z.array(z.string()).optional(),
  sketch: z.string().optional(),
  categories: z.array(EntityId).min(1),
});
export type PublishedCard = z.infer<typeof PublishedCard>;

export const CompactCard = z.object({
  id: EntityId,
  term: z.string(),
  aliases: z.array(z.string()),
  difficulty: Difficulty,
  categories: z.array(EntityId),
});

export const PublishedCategory = z.object({
  id: EntityId,
  name: z.string(),
  summary: z.string(),
  parent: EntityId.nullable(),
  children: z.array(EntityId),
});
export type PublishedCategory = z.infer<typeof PublishedCategory>;

export const PublishedRelationship = z.object({
  from: EntityId,
  type: RelationshipType,
  to: EntityId,
});
export type PublishedRelationship = z.infer<typeof PublishedRelationship>;

export const IndexEntry = z.object({
  id: EntityId,
  type: z.enum(["card", "category"]),
  name: z.string(),
});

export const Manifest = z.object({
  name: z.string(),
  description: z.string(),
  datasetVersion: z.string(),
  schemaVersion: z.string(),
  generatedAt: z.string(),
  contentHash: z.string(),
  repository: z.string(),
  license: z.object({ code: z.string(), data: z.string(), notes: z.string() }),
  counts: z.object({
    cards: z.number().int(),
    categories: z.number().int(),
    relationships: z.number().int(),
  }),
  difficulty: z.object({
    fundamental: z.number().int(),
    intermediate: z.number().int(),
    advanced: z.number().int(),
  }),
  files: z.record(z.string(), z.string()),
  checksums: z.record(z.string(), z.object({ sha256: z.string(), bytes: z.number().int() })),
  sources: z.array(z.object({ id: z.string(), note: z.string() })),
  urls: z.object({
    latest: z.string(),
    pinned: z.string(),
    releases: z.string(),
  }),
});
export type Manifest = z.infer<typeof Manifest>;
