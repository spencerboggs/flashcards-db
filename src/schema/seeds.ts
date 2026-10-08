import { z } from "zod";

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EntityId = z
  .string()
  .regex(ID_PATTERN, "ids are lowercase kebab-case (a-z, 0-9, single hyphens)")
  .max(96);

export const Difficulty = z.enum(["fundamental", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const DIFFICULTIES = Difficulty.options;

export const RelationshipType = z.enum(["prerequisite", "uses", "based-on", "related-to", "contrasts"]);
export type RelationshipType = z.infer<typeof RelationshipType>;

export const SYMMETRIC_RELATIONS = new Set<RelationshipType>(["related-to", "contrasts"]);

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const Complexity = z
  .object({
    time: shortText(240).optional(),
    space: shortText(240).optional(),
  })
  .refine((value) => value.time !== undefined || value.space !== undefined, {
    message: "complexity needs a time bound, a space bound, or both",
  });

export const SeedCard = z.object({
  id: EntityId,
  term: shortText(80),
  aliases: z.array(shortText(80)).max(8).default([]),
  prompt: shortText(160).optional(),
  difficulty: Difficulty,
  definition: z.string().trim().min(40).max(600),
  purpose: shortText(280).optional(),
  details: z.array(shortText(200)).max(5).default([]),
  complexity: Complexity.optional(),
  examples: z.array(shortText(120)).max(6).default([]),
  sketch: shortText(500).optional(),
  categories: z.array(EntityId).min(1),
});
export type SeedCard = z.infer<typeof SeedCard>;

export const SeedCategory = z.object({
  id: EntityId,
  name: shortText(60),
  summary: z.string().trim().min(20).max(200),
  parent: EntityId.optional(),
});
export type SeedCategory = z.infer<typeof SeedCategory>;

export const SeedRelationship = z.object({
  from: EntityId,
  type: RelationshipType,
  to: EntityId,
});
export type SeedRelationship = z.infer<typeof SeedRelationship>;

export const CardsFile = z.object({ cards: z.array(SeedCard).default([]) });
export const CategoriesFile = z.object({ categories: z.array(SeedCategory).default([]) });
export const RelationshipsFile = z.object({ relationships: z.array(SeedRelationship).default([]) });
