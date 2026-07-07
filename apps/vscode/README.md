# Team Topologies for VS Code

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/miragon-gmbh.team-topologies-modeler?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=miragon-gmbh.team-topologies-modeler)
[![License: MIT](https://img.shields.io/github/license/Miragon/team-topologies-modeler)](https://github.com/Miragon/team-topologies-modeler/blob/main/LICENSE)

[Team Topologies](https://teamtopologies.com/) is a way to organise software teams for a fast flow of
change: it describes four fundamental team types and three modes of interaction between them. This
extension lets you create and edit those diagrams directly inside VS Code: it opens `.tt` / `.ttm.json`
files (a Team Topologies diagram stored as plain, deterministic JSON) in a graphical editor, while the
text file stays the source of truth, so save, Git, and diff keep working.

New to the method? Start with [teamtopologies.com](https://teamtopologies.com/).

## Getting started

Install **Team Topologies Modeler** (publisher `miragon-gmbh`) from the VS Code Marketplace, then
start from a filled-in example topology or a blank diagram. The built-in **Get Started with Team
Topologies Modeler** walkthrough is the recommended first stop — open it from the Command Palette with
**Welcome: Open Walkthrough…**, then click its **Create diagram from example** button and you have a
ready-made diagram to explore. From there you can open any `.tt` or `.ttm.json` file.

Prefer commands? Run these from the Command Palette (`Cmd/Ctrl+Shift+P`, type _"Team Topologies"_):

- **Team Topologies: New Diagram from Example** — pick a location, pre-filled with the example topology.
- **Team Topologies: New Empty Diagram** — same, but a blank diagram (also under **File > New File…**).

## Reading a diagram

A diagram shows teams and how they interact.

- **The four team types**, each drawn as a distinct shape: **stream-aligned** (horizontal rounded
  rectangle) — owns a slice of the product end to end; **enabling** (vertical rounded rectangle) —
  helps other teams grow a capability; **complicated-subsystem** (octagon) — owns a part that needs
  deep specialist knowledge; **platform** (square-cornered rectangle) — provides internal services the
  other teams build on.
- **The three interaction modes**, drawn as dashed glyphs where two teams meet: **collaboration**
  (parallelogram) — two teams work closely together for a while; **X-as-a-Service** (triangle,
  pointing from the providing team to the consuming one) — one team consumes what another provides;
  **facilitating** (circle) — one team helps another for a defined period.
- **Flow of change** runs left to right across the diagram.

## Editing a diagram

- **Custom editor for `.tt` / `.ttm.json`.** Open a diagram file and you get the full graphical
  editor, backed by the plain-text JSON file. Editing the text in a split view re-renders the canvas
  live (two-way sync), and VS Code tracks dirty state as you go. To reopen a diagram as raw text, use
  **View: Reopen Editor With…**, then pick **Text Editor**.
- **Full modeler:** the tool palette places the four team types, the three interaction-mode glyphs
  (dropped over the teams they relate to), and the flow-of-change arrow; the context pad on a selected
  element renames or deletes it. Move, resize, and inline label editing all work, with undo/redo via
  `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
- **Collapsed menu** (top-right, Excalidraw-style): fit-to-view · export SVG/PNG.
- **Editable embedded-PNG diagrams (`*.tt.png` / `*.ttm.png`).** Exported PNGs store the diagram
  inside a `tEXt` chunk, so the file stays a normal image you can drop into a wiki, README, or chat —
  and can be reopened and edited graphically. To start one, run **Team Topologies: New Empty Diagram
  (embedded PNG)** (also under **File > New File…**), pick a location, and press `Ctrl/Cmd+S` once to
  render the first PNG.
- **Offline-capable** — no CDN, no network.

## Development

Building from source and the dev loop are documented in
[CONTRIBUTING.md](https://github.com/Miragon/team-topologies-modeler/blob/main/CONTRIBUTING.md).

## License

MIT
