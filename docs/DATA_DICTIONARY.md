# Data dictionary

Machine-readable copies are in `data/latest/schema/`. This page says what the fields mean.

Conventions:

- An `id` is lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). It stays the same when a term is reworded. It is not reused for a different concept.
- Category ids on a card, and `from` / `to` on a relationship, point at those ids.
- Optional fields are omitted when they have nothing to say. Empty arrays are not written on a card. `aliases` and `categories` are always present.
- `null` is used for a category with no parent.

## Card (`cards.json`)

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable slug |
| `term` | yes | Name on the front of the card |
| `aliases` | yes | Other names for the same concept. May be empty |
| `prompt` | no | Front text, when "What is {term}?" is the wrong question |
| `difficulty` | yes | `fundamental`, `intermediate`, or `advanced` |
| `definition` | yes | The answer, in a few sentences |
| `purpose` | no | Why it exists, when the definition does not already say |
| `details` | no | Up to five short extra facts |
| `complexity.time` | no | Usual time bound |
| `complexity.space` | no | Usual space bound |
| `examples` | no | Short concrete cases |
| `sketch` | no | A few lines of pseudocode |
| `categories` | yes | Category ids, sorted |

`compact/cards.json` keeps `id`, `term`, `aliases`, `difficulty`, and `categories`.

The front of a card is `prompt` when that field is present. Otherwise it is `What is {term}?`.

## Category (`categories.json`)

| Field | Meaning |
| --- | --- |
| `id` | Stable slug |
| `name` | Label |
| `summary` | One sentence on what belongs here |
| `parent` | Parent category id, or `null` |
| `children` | Direct child ids, in seed-file order |

`by-category/<id>.json` is the sorted list of card ids filed in that category or any category under it.

`by-difficulty/<level>.json` is the sorted list of card ids at that difficulty.

## Relationship (`relationships.json`)

| Field | Meaning |
| --- | --- |
| `from` | Card id |
| `type` | `prerequisite`, `uses`, `based-on`, `related-to`, or `contrasts` |
| `to` | Card id |

`prerequisite`, `uses`, and `based-on` point from the later idea to the earlier one: breadth-first search `uses` a queue, and it has a `prerequisite` of graph. `related-to` and `contrasts` are stored once, with the alphabetically earlier id in `from`.

## Index (`index.json`)

`{ id, type, name }`. `type` is `card` or `category`. `name` is the card term or the category name. Sorted by type, then id.

## Manifest (`manifest.json`)

`datasetVersion` is the release of the content. `schemaVersion` is the shape of the JSON. `contentHash` covers the cards, categories, and relationships. `checksums` covers every published file except the manifest itself. `generatedAt` stays put until that content hash changes.

`repository` is the GitHub repository. `urls.latest` is the raw base for `data/latest/` on the default branch. `urls.pinned` is the same path on the `v<datasetVersion>` tag.

`sources` has a single entry, `original`. The text is written for this database.
