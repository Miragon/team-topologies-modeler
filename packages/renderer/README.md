# @miragon/team-topologies-renderer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

The **browser layer** of the [Team Topologies Modeler](../../README.md): a framework-agnostic viewer
and full editor for [Team Topologies](https://teamtopologies.com/) diagrams, built on
[diagram-js](https://github.com/bpmn-io/diagram-js) (MIT).

It renders the canonical document from
[`@miragon/team-topologies-schema-model`](../schema-model) and gives you palette, move, resize,
connect-by-overlap, context pad, inline label editing and undo/redo — with no UI framework required.
Mount it into any `<div>`; the web app (React) and the VS Code extension both wrap this exact package.

## Install

```bash
npm install @miragon/team-topologies-renderer @miragon/team-topologies-schema-model
```

## Three entry points

| Class             | Use it for                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| `Viewer`          | Read-only rendering, no interaction (thumbnails, static embeds).               |
| `NavigatedViewer` | Read-only + zoom (scroll), pan (drag) and selection.                           |
| `Modeler`         | The full editor: palette, move, resize, context pad, label editing, undo/redo. |

All three share a common base (`TtBaseViewer`) with the same import/export and lifecycle API.

## Quick start

```ts
import { Modeler } from "@miragon/team-topologies-renderer";
import "@miragon/team-topologies-renderer/assets/team-topologies.css";
import { SAMPLE_DOCUMENT } from "@miragon/team-topologies-schema-model";

const modeler = new Modeler({ container: document.querySelector("#canvas")! });

// Load a document (auto-fits the viewport)
const { warnings } = modeler.importDocument(SAMPLE_DOCUMENT);

// Read the live canvas back as the canonical model
const doc = modeler.exportDocument();

// Export a standalone, self-contained SVG
const { svg } = modeler.saveSVG();

// Undo / redo are driven by the command stack
modeler.undo();
modeler.redo();
```

> **The CSS is required.** Import `@miragon/team-topologies-renderer/assets/team-topologies.css`
> (it also pulls in `diagram-js`'s own stylesheet) — without it the palette, context pad and label
> editor are unstyled.

## API

### Constructor — `TtViewerOptions`

```ts
new Modeler({
  container?: HTMLElement,            // host element (a detached <div> if omitted)
  width?: number | string,           // canvas width  (default "100%")
  height?: number | string,          // canvas height (default "100%", or "600px" with no container)
  additionalModules?: ModuleDeclaration[], // extra diagram-js modules
});
```

### Shared methods (`Viewer` / `NavigatedViewer` / `Modeler`)

| Method                             | Returns                         | Purpose                                           |
| ---------------------------------- | ------------------------------- | ------------------------------------------------- |
| `importDocument(doc)`              | `{ warnings: ImportWarning[] }` | Replace canvas content and auto-fit.              |
| `exportDocument()`                 | `TtDocument`                    | Rebuild the canonical model from the live canvas. |
| `saveSVG()`                        | `{ svg: string }`               | Self-contained SVG snapshot (fitted viewBox).     |
| `setMeta(partial)` / `getMeta()`   | — / `RootBusinessObject`        | Read/write diagram-level metadata (e.g. `title`). |
| `attachTo(el)` / `detach()`        | `void`                          | Move the canvas in/out of the DOM (keeps state).  |
| `clear()` / `destroy()`            | `void`                          | Empty the canvas / tear it down.                  |
| `on(event, cb)` / `off(event, cb)` | `void`                          | Subscribe to diagram-js events.                   |
| `get<T>(name)`                     | `T`                             | Resolve a diagram-js service (advanced).          |

### Modeler-only

`undo()`, `redo()`, `canUndo()`, `canRedo()`.

### Helpers & types

- **Type guards:** `isTtElement`, `isTtTeam`, `isTtInteraction`, `isTtFlow`.
- **Runtime element types:** `TtTeam`, `TtInteraction`, `TtFlow`, `TtElement`.
- **Palette icon generators:** `teamIconSvg(type)`, `interactionIconSvg(mode)`, `flowIconSvg()` —
  WYSIWYG SVG glyphs matching what the canvas draws.
- **Other:** `TtViewerOptions`, `ImportWarning`, `RootBusinessObject`, `ROOT_ID`, `saveSVG`.

## How it's built

The package is a set of [didi](https://github.com/nikku/didi) modules layered on diagram-js. Each is
exported (e.g. `ttDrawModule`, `ttPaletteModule`, `ttModelingModule`) so you can compose your own
viewer via `additionalModules`:

| Module                 | Responsibility                                                                   |
| ---------------------- | -------------------------------------------------------------------------------- |
| `ttModelModule`        | Element factory with notation defaults (`TtElementFactory`).                     |
| `ttDrawModule`         | Custom SVG rendering of teams, interactions and flow (`TeamTopologiesRenderer`). |
| `ioModule`             | Document ↔ canvas bridge (`TtImporter`, `TtExporter`, `saveSVG`).               |
| `ttModelingModule`     | High-level mutations — label, team type, interaction mode, colours, description. |
| `ttRulesModule`        | Editing rules (what can move / resize / be created).                             |
| `ttBehaviorsModule`    | Keeps the model **flat** — shapes never nest.                                    |
| `ttPaletteModule`      | The drag-to-create tool palette.                                                 |
| `ttContextPadModule`   | Per-element actions (rename, delete).                                            |
| `ttLabelEditingModule` | Double-click inline label editing.                                               |
| `ttKeyboardModule`     | Undo / redo / delete shortcuts.                                                  |
| `ttZOrderModule`       | Fixed stacking order (flow behind, teams, interactions on top).                  |

### Rendering

A custom `TeamTopologiesRenderer` (priority `1500`, beating diagram-js's default) draws each element
from the spec in [`@miragon/team-topologies-schema-model`](../schema-model): the four team outlines
(octagon, vertical/horizontal rounded rectangles, square rectangle) drawn solid; the three
interaction glyphs (parallelogram, triangle, circle) drawn dashed and translucent; the flow-of-change
as a dashed left-to-right band. Labels are word-wrapped and centred. Per-element `fill`/`stroke`
overrides win over the spec defaults.

## Import / export

The package reads and writes the canonical `TtDocument` (JSON) and exports a standalone **SVG**.
PNG export and the embedded-scene round-trip (storing the document inside the exported image) live in
the [web app](../../apps/webapp) and the [VS Code extension](../../apps/vscode), which add the canvas
rasterisation those formats need.

## Development

Part of the [Team Topologies Modeler](../../README.md) monorepo; consumed from source by the apps.
From the repo root:

```bash
npm run build -w packages/renderer   # Vite library build → dist/ (publish build)
npm test                             # Vitest unit tests
npm run test:browser                 # renderer integration tests in real Chromium
npm run typecheck
```

## License

[MIT](../../LICENSE). diagram-js and its dependencies are MIT / ISC / Apache-2.0.
