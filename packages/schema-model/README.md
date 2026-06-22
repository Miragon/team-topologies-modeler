# @miragon/team-topologies-schema-model

[![npm](https://img.shields.io/npm/v/@miragon/team-topologies-schema-model)](https://www.npmjs.com/package/@miragon/team-topologies-schema-model)
[![License: MIT](https://img.shields.io/github/license/Miragon/team-topologies-modeler)](https://github.com/Miragon/team-topologies-modeler/blob/main/LICENSE)

The **DOM-free core** of the [Team Topologies Modeler](../../README.md): the data model, the notation
specification, runtime validation, version migrations and deterministic JSON serialization for
[Team Topologies](https://teamtopologies.com/) diagrams.

This package has **no view, no DOM and no diagram-js** — it is plain TypeScript that runs anywhere
(browser, Node, an edge function, a CLI). The browser renderer
([`@miragon/team-topologies-renderer`](../renderer)), the web app and the VS Code extension all build
on top of it. The DOM-freedom is enforced in CI (ESLint `no-restricted-imports` /
`no-restricted-globals` **and** `dependency-cruiser`), so a stray `diagram-js`/`window`/`document`
reference fails the build.

## Install

```bash
npm install @miragon/team-topologies-schema-model
```

## What's inside

- **The notation spec** — the four team types and three interaction modes, with their official
  shapes, colours and stroke styles as plain data you can read and render against.
- **The document model** — a small, stable shape (`TtDocument`) with `version`, `title`, `nodes`,
  `interactions` and `flows`.
- **Runtime validation** — Zod schemas + `parseDocument()` for everything that comes from a file, a
  URL or `localStorage`.
- **Forward migrations** — `parseDocument()` migrates older documents up to the current version
  before validating, keyed by the document `version`.
- **Deterministic serialization** — sorted, rounded and version-stamped output, so `.tt` /
  `.ttm.json` files diff cleanly and share URLs stay stable.
- **Factories & a sample** — helpers that create well-formed elements and documents, plus a complete
  example topology.

## The document format

A diagram is a single JSON object. Interactions are **placed shapes** that overlap the teams they
relate to (spatial overlap, the Team Topologies convention) — there is no source/target reference.

```jsonc
{
  "version": 2,
  "title": "Online retail — team topology",
  "nodes": [
    {
      "id": "team_checkout",
      "type": "stream-aligned",
      "label": "Checkout Stream",
      "position": { "x": 320, "y": 110 },
      "size": { "width": 240, "height": 96 },
    },
  ],
  "interactions": [
    {
      "id": "int_platform_checkout",
      "mode": "x-as-a-service",
      "position": { "x": 384, "y": 396 },
      "size": { "width": 96, "height": 96 },
    },
  ],
  "flows": [],
}
```

| Field          | Type                 | Notes                                                                                |
| -------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `version`      | `2`                  | `DOCUMENT_VERSION`; older versions are migrated up on parse.                         |
| `title`        | `string`             | Diagram name.                                                                        |
| `nodes`        | `TeamNode[]`         | A team: `type`, `label`, `position`, `size`, optional `description`/`fill`/`stroke`. |
| `interactions` | `InteractionShape[]` | A placed interaction: `mode`, `position`, `size`, optional `label`/`fill`/`stroke`.  |
| `flows`        | `FlowShape[]`        | A flow-of-change band: `position`, `size`, optional `label`.                         |

## Notation

The single source of truth for the visual notation. Shapes and colours follow the official
[Team-Shape-Templates](https://github.com/TeamTopologies/Team-Shape-Templates) — every element is
distinguished by shape **and** colour, so diagrams survive colour-vision deficiency and greyscale
printing. Team shapes are **solid** (long-lived); interaction shapes are **dashed and translucent**
(short-lived).

### Team types — `TEAM_TYPE_SPECS`

| `type`                  | Label                 | Shape                        | Fill / Stroke         |
| ----------------------- | --------------------- | ---------------------------- | --------------------- |
| `stream-aligned`        | Stream-aligned        | horizontal rounded rectangle | `#FFEDB8` / `#FFD966` |
| `enabling`              | Enabling              | vertical rounded rectangle   | `#DFBDCF` / `#D09CB7` |
| `complicated-subsystem` | Complicated Subsystem | octagon                      | `#FFC08B` / `#E88814` |
| `platform`              | Platform              | square-cornered rectangle    | `#B7CDF1` / `#6D9EEB` |

### Interaction modes — `INTERACTION_MODE_SPECS`

| `mode`           | Label          | Glyph                                 | Fill / Stroke         |
| ---------------- | -------------- | ------------------------------------- | --------------------- |
| `collaboration`  | Collaboration  | parallelogram                         | `#C6BEDF` / `#967EE2` |
| `x-as-a-service` | X-as-a-Service | triangle (points provider → consumer) | `#B4B4B4` / `#999696` |
| `facilitating`   | Facilitating   | circle                                | `#C9DFBE` / `#78996B` |

The **flow of change** is described separately by `FLOW_SPEC` (a left-to-right dashed band).

## Usage

```ts
import {
  emptyDocument,
  createTeamNode,
  createInteractionShape,
  serializeDocument,
  parseDocument,
  SAMPLE_DOCUMENT,
} from "@miragon/team-topologies-schema-model";

// Build a document with the factories (notation defaults applied automatically)
const doc = emptyDocument("Online retail");
doc.nodes.push(createTeamNode("stream-aligned", { x: 320, y: 110 }));
doc.interactions.push(createInteractionShape("x-as-a-service", { x: 384, y: 396 }));

// Serialize deterministically (sorted, rounded, version-stamped) — diff- and URL-stable
const json = serializeDocument(doc);

// Validate + migrate anything untrusted (file / URL / localStorage)
const result = parseDocument(JSON.parse(json));
if (result.ok) {
  console.log(result.document.title);
} else {
  console.error(result.error);
}

// A ready-made example topology
console.log(SAMPLE_DOCUMENT.title);
```

### API surface

| Export                                                                                            | Purpose                                                              |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `TtDocument`, `TeamNode`, `InteractionShape`, `FlowShape`, `Position`, `Size`                     | The document model types.                                            |
| `TeamType`, `InteractionMode`, `TEAM_TYPES`, `INTERACTION_MODES`                                  | The notation's discriminator unions + their value lists.             |
| `TEAM_TYPE_SPECS`, `INTERACTION_MODE_SPECS`, `FLOW_SPEC`, `dashArray()`                           | The visual notation spec (shapes, colours, strokes) as data.         |
| `documentSchema`, `teamNodeSchema`, `interactionSchema`, `flowSchema`                             | Zod schemas for each shape.                                          |
| `parseDocument()`, `ParseResult`                                                                  | Validate **and migrate** unknown input into a `TtDocument`.          |
| `serializeDocument()`, `canonicalize()`                                                           | Deterministic JSON serialization (sorted, rounded, fixed key order). |
| `emptyDocument()`, `createTeamNode()`, `createInteractionShape()`, `createFlowShape()`, `newId()` | Factories with notation defaults + id generation.                    |
| `SAMPLE_DOCUMENT`                                                                                 | A complete example topology.                                         |
| `DOCUMENT_VERSION`                                                                                | The current document version (`2`).                                  |

## Determinism & migrations

- **Determinism** — `serializeDocument()` runs `canonicalize()` first: arrays are sorted by `id`,
  coordinates are rounded to two decimals, optional fields with no value are dropped, and keys are
  written in a fixed order. The same logical diagram always produces byte-identical JSON, which is
  what makes Git diffs small and share URLs stable.
- **Migrations** — `parseDocument()` upgrades older documents before validating (keyed by `version`).
  The `1 → 2` step drops the legacy `showFlowOfChange` flag and the old edge-based interactions,
  keeping only interactions that carry geometry (the placed-shape model).

## Development

This package is part of the [Team Topologies Modeler](../../README.md) monorepo and is normally
consumed from source. From the repo root:

```bash
npm run build -w packages/schema-model   # tsup → dist/ (publish build)
npm test                                 # Vitest unit tests
npm run typecheck                        # tsc, compiled WITHOUT the DOM lib
```

## License

[MIT](../../LICENSE).
