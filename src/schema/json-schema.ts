const id = { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 96 };
const difficulty = { enum: ["fundamental", "intermediate", "advanced"] };
const relation = { enum: ["prerequisite", "uses", "based-on", "related-to", "contrasts"] };

export const jsonSchemas: Record<string, unknown> = {
  "card.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "card.schema.json",
    title: "Card",
    type: "object",
    additionalProperties: false,
    required: ["id", "term", "aliases", "difficulty", "definition", "categories"],
    properties: {
      id,
      term: { type: "string", minLength: 1, maxLength: 80 },
      aliases: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 80 } },
      prompt: { type: "string", minLength: 1, maxLength: 160 },
      difficulty,
      definition: { type: "string", minLength: 40, maxLength: 600 },
      purpose: { type: "string", minLength: 1, maxLength: 280 },
      details: { type: "array", maxItems: 5, items: { type: "string", minLength: 1, maxLength: 200 } },
      complexity: {
        type: "object",
        additionalProperties: false,
        properties: {
          time: { type: "string", minLength: 1, maxLength: 240 },
          space: { type: "string", minLength: 1, maxLength: 240 },
        },
      },
      examples: { type: "array", maxItems: 6, items: { type: "string", minLength: 1, maxLength: 120 } },
      sketch: { type: "string", minLength: 1, maxLength: 500 },
      categories: { type: "array", minItems: 1, items: id },
    },
  },
  "category.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "category.schema.json",
    title: "Category",
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "summary", "parent", "children"],
    properties: {
      id,
      name: { type: "string", minLength: 1, maxLength: 60 },
      summary: { type: "string", minLength: 20, maxLength: 200 },
      parent: { anyOf: [id, { type: "null" }] },
      children: { type: "array", items: id },
    },
  },
  "relationship.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "relationship.schema.json",
    title: "Relationship",
    type: "object",
    additionalProperties: false,
    required: ["from", "type", "to"],
    properties: { from: id, type: relation, to: id },
  },
  "index.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "index.schema.json",
    title: "Index entry",
    type: "object",
    additionalProperties: false,
    required: ["id", "type", "name"],
    properties: {
      id,
      type: { enum: ["card", "category"] },
      name: { type: "string" },
    },
  },
};
