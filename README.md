# Team Topologies Modeler

A fast, offline-friendly modeler for **Team Topologies** diagrams — the four team types and three
team-interaction modes from the book by Matthew Skelton & Manuel Pais. Ships as a **web app** and a
**VS Code extension** sharing one diagram-js core.

It mirrors the structure of [Miragon's Wardley Maps Modeler](https://github.com/Miragon/wardley-maps-modeler):
the same npm-workspaces monorepo, CI/CD, release automation and "full-bleed canvas + floating chrome"
editing feel, with a clean DOM-free domain model and lossless, version-controllable files — but built
around the Team Topologies notation.

![The Team Topologies editor](docs/screenshots/editor.png)

## Notation

Shapes, colours and stroke styles follow the official
[Team-Shape-Templates](https://github.com/TeamTopologies/Team-Shape-Templates). Team shapes are
**solid** (long-lived); interaction shapes are **dashed and translucent** (short-lived). Every element
is distinguished by shape as well as colour, so diagrams stay readable with colour-vision deficiency.

### Team types

| Type                  | Shape                        | Fill / Outline        |
| --------------------- | ---------------------------- | --------------------- |
| Stream-aligned        | horizontal rounded rectangle | `#FFEDB8` / `#FFD966` |
| Enabling              | vertical rounded rectangle   | `#DFBDCF` / `#D09CB7` |
| Complicated Subsystem | octagon                      | `#FFC08B` / `#E88814` |
| Platform              | square-cornered rectangle    | `#B7CDF1` / `#6D9EEB` |

### Interaction modes

| Mode           | Badge                                 | Fill / Outline        |
| -------------- | ------------------------------------- | --------------------- |
| Collaboration  | parallelogram                         | `#C6BEDF` / `#967EE2` |
| X-as-a-Service | triangle (points provider → consumer) | `#B4B4B4` / `#999696` |
| Facilitating   | circle                                | `#C9DFBE` / `#78996B` |

## Targets

- **Web app** ([`apps/webapp`](apps/webapp/README.md)) — a Vite + React editor with a full-bleed
  canvas, palette, inspector, PNG/SVG export and a shareable, self-contained URL (LZ-compressed, no
  backend). Deployed on Netlify.
- **VS Code extension** ([`apps/vscode`](apps/vscode/README.md)) — a custom editor for `.tt` /
  `.ttm.json` files: the JSON file stays the source of truth (save, Git and diff keep working), and
  editable embedded-PNG diagrams (`*.tt.png`) let you drop a diagram into a wiki or README and still
  edit it graphically.

Both targets share two published packages:

| Package                                                                    | Purpose                                                                          | DOM |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- |
| [`@miragon/team-topologies-schema-model`](packages/schema-model/README.md) | Types, the notation spec, Zod validation, migrations, deterministic JSON         | no  |
| [`@miragon/team-topologies-renderer`](packages/renderer/README.md)         | diagram-js viewer/modeler, custom rendering, palette, context pad, import/export | yes |

## Getting started

Requires Node ≥ 22.13 and npm. From the repo root:

```bash
npm install
npm run dev:webapp   # start the webapp dev server (http://localhost:5181)
npm run dev:vscode   # watch-build the VS Code extension (then F5 in VS Code)
npm test             # unit tests (Vitest)
npm run lint         # eslint + type-check
npm run build        # build the publishable packages (schema-model, renderer)
```

## Architecture

An **npm-workspaces monorepo** with a strict boundary between the pure model and the view:

```
packages/
  schema-model/  @miragon/team-topologies-schema-model — DOM-free core: types, notation spec, Zod schema,
                                            deterministic JSON, migrations, factory, the example.
  renderer/      @miragon/team-topologies-renderer     — diagram-js bootstrap: viewer/modeler, renderer, palette,
                                            context-pad, label editing, import/export, CSS.
apps/
  webapp/        @miragon/team-topologies-webapp       — Vite + React editor application.
  vscode/        team-topologies-modeler  — VS Code custom editor for .tt / .ttm.json.
e2e/                                       — Playwright end-to-end tests for the webapp.
```

The `schema-model` package compiles **without the DOM lib**, so a stray browser import fails
type-checking. The DOM boundary is enforced twice — by ESLint and by dependency-cruiser. The apps and
tests consume the packages straight from their TS source via Vite/esbuild/tsconfig aliases, so there
is no separate library build step for development (`npm run build` is only needed to publish the libs).

Design choices:

- **Deterministic serialisation** (sorted, rounded, fixed key order) makes `.tt` / `.ttm.json` files
  diff-friendly and gives stable share URLs.
- **Runtime validation** (Zod) on everything imported from files / URLs / localStorage, with a
  forward-migration hook keyed by document `version`.
- **diagram-js** (MIT) as the editor engine — palette, move, resize, context pad,
  inline label editing and undo/redo for free.

## Document format

`.tt` / `.ttm.json` is a small, stable JSON document. Interactions are **placed shapes** overlaying the
boundary between the teams they relate to (spatial overlap), so there is no source/target reference:

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the agent notes in [CLAUDE.md](CLAUDE.md).

## Licence

MIT. "Team Topologies" is a trademark of Team Topologies Ltd; this is an independent, unaffiliated
tool that implements their openly published notation.
