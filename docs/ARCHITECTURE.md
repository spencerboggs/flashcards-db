# Architecture

The repository is a dataset. Code validates the seeds and publishes JSON. Consumers read `data/latest/` over HTTPS. Cards are written in YAML.

```text
data/seeds/*.yaml
        │
        ▼
   assemble          check ids, categories, names, and relationships
        │
        ▼
   publish           data/latest/   cards, categories, relationships,
                     indexes, per-card files, schemas, manifest
```

| Path | Written by | Hand-edit? |
| --- | --- | --- |
| `data/seeds/` | People | Yes |
| `data/latest/` | `npm run build:data` | No |

Running the build twice with the same seeds produces the same files. `manifest.generatedAt` changes only when the card, category, or relationship content changes.

Arrays of card ids are sorted. Category order follows `data/seeds/categories.yaml`. JSON objects use a fixed key order.

## Code

```text
src/
  cli/index.ts          validate, build
  config.ts             dataset.config.json and paths
  schema/seeds.ts       YAML shapes
  schema/published.ts   JSON shapes
  schema/json-schema.ts drafts written into data/latest/schema
  pipeline/assemble.ts  seeds to an in-memory dataset
  pipeline/publish.ts   dataset to data/latest
  pipeline/build.ts     build and validate
```
