# CS Flashcards

JSON dataset of short computer-science flashcards. Each card is one concept, written so it can be recalled on its own.

Fetch it over HTTPS. Clone the repository when you want to change the cards.

Repository: https://github.com/spencerboggs/flashcards-db

## Fetch the data

Current build:

```
https://raw.githubusercontent.com/spencerboggs/flashcards-db/main/data/latest/
```

`manifest.json` lists `urls.latest` (the URL above), `urls.pinned` (the same path on tag `v0.1.0`), record counts, and a sha256 checksum for every other file. Use `main` for the current build. Use the tag once it exists if you want that release to stay fixed.

```js
const BASE = "https://raw.githubusercontent.com/spencerboggs/flashcards-db/main/data/latest/";

const [cards, algorithmIds] = await Promise.all([
  fetch(BASE + "cards.json").then((r) => r.json()),
  fetch(BASE + "by-category/algorithms.json").then((r) => r.json()),
]);

const byId = new Map(cards.map((card) => [card.id, card]));
const deck = algorithmIds.map((id) => byId.get(id));

for (const card of deck) {
  const front = card.prompt ?? `What is ${card.term}?`;
  const back = card.definition;
}
```

```python
import requests

BASE = "https://raw.githubusercontent.com/spencerboggs/flashcards-db/main/data/latest/"
cards = requests.get(BASE + "cards.json").json()
ids = requests.get(BASE + "by-difficulty/fundamental.json").json()
by_id = {card["id"]: card for card in cards}
deck = [by_id[card_id] for card_id in ids]
```

```bash
curl -sL https://raw.githubusercontent.com/spencerboggs/flashcards-db/main/data/latest/manifest.json
```

One record at a time:

```
data/latest/entities/cards/binary-search.json
data/latest/by-category/algorithms.json
data/latest/by-difficulty/fundamental.json
data/latest/index.json
```

`by-category/<id>.json` and `by-difficulty/<level>.json` are sorted arrays of card ids. A parent category includes cards filed under its children, so `by-category/security.json` includes cryptography cards. Look those ids up in `cards.json`, or fetch `entities/cards/<id>.json` for a single card.

## Files

All of these are under `data/latest/`.

| File | Contents |
| --- | --- |
| `manifest.json` | Versions, counts, checksums, fetch URLs |
| `cards.json` | Every card |
| `compact/cards.json` | `id`, `term`, `aliases`, `difficulty`, `categories` |
| `categories.json` | Category tree |
| `relationships.json` | Links between cards |
| `index.json` | `id`, `type`, and `name` for every card and category |
| `entities/cards/<id>.json` | One card |
| `by-category/<id>.json` | Card ids in that category and its children |
| `by-difficulty/<level>.json` | Card ids at `fundamental`, `intermediate`, or `advanced` |
| `schema/*.schema.json` | JSON Schema for the records |

Join records on `id`. Category ids on a card match `categories.json`. Relationship endpoints match card ids.

## Fields

An `id` is a stable kebab-case slug (`binary-search`). It stays the same when the wording of a term changes. Optional fields are left off when they have nothing to add. `aliases` and `categories` are always present, and `aliases` may be an empty array.

The front of a card is `prompt` when that field is present. Otherwise it is `What is {term}?`. The back starts with `definition`.

| Field | Meaning |
| --- | --- |
| `id` | Stable slug |
| `term` | Name on the front of the card |
| `aliases` | Other names for the same concept |
| `prompt` | Front text, when "What is {term}?" is the wrong question |
| `difficulty` | `fundamental`, `intermediate`, or `advanced` |
| `definition` | The answer, in a few sentences |
| `purpose` | Why it exists, when the definition does not already say |
| `details` | Up to five short extra facts |
| `complexity.time` | Usual time bound |
| `complexity.space` | Usual space bound |
| `examples` | Short concrete cases |
| `sketch` | A few lines of pseudocode |
| `categories` | Category ids, sorted |

`difficulty` follows the idea. `fundamental` is an idea a working engineer is expected to explain. `intermediate` depends on those ideas. `advanced` is specialized.

A category has `id`, `name`, `summary`, `parent` (`null` at the top), and `children`.

A relationship is `{ from, type, to }`, and both ends are card ids.

| `type` | Meaning |
| --- | --- |
| `prerequisite` | Understand `to` before `from` |
| `uses` | `from` uses `to` |
| `based-on` | `from` is built on `to` |
| `related-to` | Related ideas, stored once |
| `contrasts` | Pair that is easy to mix up, stored once |

`related-to` and `contrasts` keep the alphabetically earlier id in `from`.

`index.json` rows are `{ id, type, name }`. `type` is `card` or `category`. `name` is the card term or the category name.

The same notes are in [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md).

## License

MIT. See [LICENSE](LICENSE).

## Edit the data

Cards live in `data/seeds/cards.yaml`, categories in `data/seeds/categories.yaml`, and links in `data/seeds/relationships.yaml`. Leave `data/latest/` alone. `npm run build:data` regenerates it, and the seed change and the regenerated JSON belong in the same commit. Node.js 22 or newer.

One concept is one card. Another name for that concept goes in `aliases`.

```bash
npm install
npm run validate
npm run build:data
npm test
```

`npm run check` typechecks, runs the tests, and checks that `data/latest/` matches the seeds.
