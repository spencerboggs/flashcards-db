import type { Paths } from "../config.ts";
import { readYaml } from "../lib/io.ts";
import {
  CardsFile,
  CategoriesFile,
  type Difficulty,
  RelationshipsFile,
  type SeedCard,
  type SeedCategory,
  type SeedRelationship,
  SYMMETRIC_RELATIONS,
} from "../schema/seeds.ts";
import type { PublishedCard, PublishedCategory, PublishedRelationship } from "../schema/published.ts";

export class BuildError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join("\n"));
    this.name = "BuildError";
  }
}

export interface Dataset {
  cards: PublishedCard[];
  categories: PublishedCategory[];
  relationships: PublishedRelationship[];
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9+#*]+/g, "");
}

function uniqueIds(label: string, ids: string[], errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label} id "${id}" is duplicated`);
    seen.add(id);
  }
}

function categoryCycles(categories: SeedCategory[], errors: string[]): void {
  const parentOf = new Map(categories.map((category) => [category.id, category.parent]));
  for (const category of categories) {
    const seen = new Set<string>();
    let current: string | undefined = category.id;
    while (current) {
      if (seen.has(current)) {
        errors.push(`category "${category.id}" is part of a parent cycle`);
        break;
      }
      seen.add(current);
      current = parentOf.get(current);
    }
  }
}

function prerequisiteCycles(relationships: SeedRelationship[], errors: string[]): void {
  const edges = new Map<string, string[]>();
  for (const link of relationships) {
    if (link.type !== "prerequisite") continue;
    const next = edges.get(link.from) ?? [];
    next.push(link.to);
    edges.set(link.from, next);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string, stack: string[]): void => {
    if (visiting.has(id)) {
      const cycle = [...stack.slice(stack.indexOf(id)), id];
      errors.push(`prerequisite cycle: ${cycle.join(" -> ")}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) walk(next, [...stack, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of edges.keys()) walk(id, []);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function assemble(paths: Paths): Dataset {
  const cardsFile = readYaml(paths.seeds.cards, CardsFile);
  const categoriesFile = readYaml(paths.seeds.categories, CategoriesFile);
  const relationshipsFile = readYaml(paths.seeds.relationships, RelationshipsFile);
  const errors: string[] = [];

  uniqueIds(
    "card",
    cardsFile.cards.map((card) => card.id),
    errors,
  );
  uniqueIds(
    "category",
    categoriesFile.categories.map((category) => category.id),
    errors,
  );

  const categoryIds = new Set(categoriesFile.categories.map((category) => category.id));
  for (const category of categoriesFile.categories) {
    if (category.parent && !categoryIds.has(category.parent)) {
      errors.push(`category "${category.id}" has unknown parent "${category.parent}"`);
    }
    if (category.parent === category.id) errors.push(`category "${category.id}" is its own parent`);
  }
  categoryCycles(categoriesFile.categories, errors);

  const names = new Map<string, string>();
  const claim = (label: string, cardId: string): void => {
    const key = normalizeName(label);
    if (!key) return;
    const owner = names.get(key);
    if (owner && owner !== cardId) errors.push(`"${label}" names both "${owner}" and "${cardId}"`);
    else names.set(key, cardId);
  };

  const cards: PublishedCard[] = [];
  for (const card of cardsFile.cards) {
    claim(card.term, card.id);
    const aliases: string[] = [];
    const seenAliases = new Set<string>();
    for (const alias of card.aliases) {
      const key = normalizeName(alias);
      if (!key || key === normalizeName(card.term) || seenAliases.has(key)) continue;
      seenAliases.add(key);
      claim(alias, card.id);
      aliases.push(alias);
    }
    const categories = dedupe(card.categories).sort();
    for (const categoryId of categories) {
      if (!categoryIds.has(categoryId)) errors.push(`card "${card.id}" has unknown category "${categoryId}"`);
    }
    const published: PublishedCard = {
      id: card.id,
      term: card.term,
      aliases,
      difficulty: card.difficulty,
      definition: card.definition,
      categories,
    };
    if (card.prompt) published.prompt = card.prompt;
    if (card.purpose) published.purpose = card.purpose;
    if (card.details.length) published.details = dedupe(card.details);
    if (card.complexity) published.complexity = card.complexity;
    if (card.examples.length) published.examples = dedupe(card.examples);
    if (card.sketch) published.sketch = card.sketch;
    cards.push(published);
  }
  cards.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const cardIds = new Set(cards.map((card) => card.id));
  const seenLinks = new Set<string>();
  const relationships: PublishedRelationship[] = [];
  for (const link of relationshipsFile.relationships) {
    if (!cardIds.has(link.from)) errors.push(`relationship from unknown card "${link.from}"`);
    if (!cardIds.has(link.to)) errors.push(`relationship to unknown card "${link.to}"`);
    if (link.from === link.to) errors.push(`relationship "${link.type}" on "${link.from}" points at itself`);
    if (SYMMETRIC_RELATIONS.has(link.type) && link.from > link.to) {
      errors.push(
        `"${link.type}" is stored once; put the earlier id first ("${link.to}" then "${link.from}")`,
      );
    }
    const key = `${link.from}\0${link.type}\0${link.to}`;
    if (seenLinks.has(key)) errors.push(`duplicate relationship ${link.from} ${link.type} ${link.to}`);
    seenLinks.add(key);
    relationships.push({ from: link.from, type: link.type, to: link.to });
  }
  prerequisiteCycles(relationshipsFile.relationships, errors);
  relationships.sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
  });

  if (errors.length) throw new BuildError(errors);

  const children = new Map<string, string[]>(categoriesFile.categories.map((category) => [category.id, []]));
  for (const category of categoriesFile.categories) {
    if (!category.parent) continue;
    children.get(category.parent)?.push(category.id);
  }

  const categories: PublishedCategory[] = categoriesFile.categories.map((category) => ({
    id: category.id,
    name: category.name,
    summary: category.summary,
    parent: category.parent ?? null,
    children: children.get(category.id) ?? [],
  }));

  return { cards, categories, relationships };
}

export function cardsInCategory(dataset: Dataset, categoryId: string): string[] {
  const children = new Map(dataset.categories.map((category) => [category.id, category.children]));
  const included = new Set<string>();
  const stack = [categoryId];
  while (stack.length) {
    const current = stack.pop();
    if (!current || included.has(current)) continue;
    included.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return dataset.cards
    .filter((card) => card.categories.some((category) => included.has(category)))
    .map((card) => card.id);
}

export function cardsAtDifficulty(dataset: Dataset, difficulty: Difficulty): string[] {
  return dataset.cards.filter((card) => card.difficulty === difficulty).map((card) => card.id);
}
