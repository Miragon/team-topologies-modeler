# Team Topologies for VS Code

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/miragon-gmbh.team-topologies-modeler?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=miragon-gmbh.team-topologies-modeler)
[![License: MIT](https://img.shields.io/github/license/Miragon/team-topologies-modeler)](https://github.com/Miragon/team-topologies-modeler/blob/main/LICENSE)

View and edit [Team Topologies](https://teamtopologies.com/) diagrams directly inside VS Code. The
extension opens `.tt` / `.ttm.json` files in a graphical editor — the JSON file stays the source of
truth, so save, Git, and diff keep working.

## Features

- **Custom editor for `.tt` / `.ttm.json`.** Open a diagram file and you get the full graphical
  editor; the file on disk stays plain, deterministic JSON.
- **The text file is the source of truth.** VS Code handles dirty state, save (`Ctrl/Cmd+S`), Git,
  and diffing for free; editing the JSON in a split view re-renders the canvas live (two-way sync).
- **Full modeler:** palette (the four team types + the three interaction modes + flow-of-change),
  move, resize, inline label editing, undo/redo via `Ctrl/Cmd+Z`.
- **Collapsed menu** (top-right, Excalidraw-style): fit-to-view · export SVG/PNG.
- **Export SVG & PNG with the scene embedded** — exported images can be reopened as editable
  diagrams.
- **Editable embedded-PNG diagrams (`*.tt.png` / `*.ttm.png`).** The diagram is stored inside the
  PNG (a `tEXt` chunk), so the file stays a normal image you can drop into a wiki, README, or chat —
  and still edit graphically.
- **Offline-capable** — no CDN, no network.

## Getting started

Open any `.tt` or `.ttm.json` file — or create one with the commands below.

## Commands

- **Team Topologies: New Empty Diagram** — pick a location, get a blank diagram.
- **Team Topologies: New Diagram from Example** — same, pre-filled with the example topology.
- **Team Topologies: New Empty Diagram (embedded PNG)** — pick a location for a `*.tt.png`; press
  `Ctrl/Cmd+S` once to render the first PNG, then edit it like any other diagram.

To reopen a diagram as raw text, use **View: Reopen Editor With… → Text Editor**.

## Development

Building from source and the dev loop are documented in
[CONTRIBUTING.md](https://github.com/Miragon/team-topologies-modeler/blob/main/CONTRIBUTING.md).

## License

MIT
