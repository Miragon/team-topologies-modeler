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

The editor is the shared chrome of the Miragon modelers: a full-bleed canvas with the menu at the
top left, the tool palette at the top centre, the zoom panel at the bottom right and the legend at
the bottom left, the same in every Miragon modeler.

- **Custom editor for `.tt` / `.ttm.json`.** Open a diagram file and you get the full graphical
  editor, backed by the plain-text JSON file. **Open Source to the Side** (the file icon in the
  editor title) shows the JSON next to the canvas, **Open Diagram to the Side** does the reverse;
  edits on either side show on the other at once, and VS Code tracks dirty state as you go.
- **Full modeler:** the tool palette places the four team types, the three interaction-mode glyphs
  (dropped over the teams they relate to), the flow-of-change arrow and text annotations; Enter or
  Space on a palette entry places it in the middle of the free canvas with its name ready to type.
  The context pad on a selected element renames it, adds an attached annotation, or deletes it.
  Double-click any element to edit its label in place. Select several elements with `Ctrl/Cmd+A`, a
  Shift+drag lasso or Shift+click, then move, copy or delete them together.
- **Undo is VS Code's.** Every change on the canvas is one edit of the file, so `Ctrl/Cmd+Z` and
  `Ctrl/Cmd+Shift+Z` undo and redo it in the file's history, from the canvas and the text editor
  alike; the canvas keeps its view and selection.
- **Inspector** (right, a bottom sheet in narrow panes): select an element to edit its properties
  without touching the JSON. Change a team's type, name, description and fill or outline colour, an
  interaction's mode and label, the flow-of-change label, or an annotation's text, and detach an
  annotation from its element. With several elements selected, it deletes them together.
- **Legend** (bottom-left): which shape stands for which team type, interaction mode and element,
  each with a short explanation, and that teams are solid and long-lived while interactions are
  dashed and short-lived. Switch it on and off with **Legend** in the menu or its close button. It
  starts hidden in panes shorter than 820 px, and each editor remembers your choice.
- **Menu** (top-left, the icon button): the legend, **Export as PNG** and **Export as SVG**, and
  **Keyboard shortcuts…**. The exports and **Fit to View** are also commands in the Command Palette
  and in the editor title's **…** menu.
- **Zoom panel** (bottom-right): zoom out, the current level (click for 100 %), zoom in, and fit to
  view. `Ctrl/Cmd` with `+`, `-` and `0` zoom the diagram while it has the focus (not the VS Code
  window), and `Shift+1` fits it.
- **An invalid file** (a typo in the JSON, a value the format doesn't know, an id used twice) shows
  the last valid diagram, read-only, with a note under the palette until the text is valid again, so
  no change on the canvas overwrites the text you are fixing. The **Problems** view says what is
  wrong and where; the problems pill at the bottom left opens it.
- **An empty file** opens at 100 % with **Insert example**, which adds the example topology to the
  file as one undoable edit and keeps its title.
- **Editable embedded-PNG diagrams (`*.tt.png` / `*.ttm.png`).** Exported PNGs store the diagram
  inside a `tEXt` chunk, so the file stays a normal image you can drop into a wiki, README, or chat —
  and can be reopened and edited graphically. To start one, run **Team Topologies: New Empty Diagram
  (embedded PNG)** (also under **File > New File…**), pick a location, and press `Ctrl/Cmd+S` once to
  render the first PNG.
- **Themes.** The diagram stays light in dark VS Code themes until the Miragon modelers get their
  dark mode together; the high-contrast themes switch it to high contrast.
- **File icon.** `.tt` and `.ttm.json` files carry the Team Topologies icon in the Explorer and on
  editor tabs, in light and dark themes, and both get JSON syntax highlighting in the text editor.
- **Offline-capable** — no CDN, no network. The third-party licenses ship with the extension in
  `THIRD_PARTY_NOTICES.md`.

## Development

Building from source and the dev loop are documented in
[CONTRIBUTING.md](https://github.com/Miragon/team-topologies-modeler/blob/main/CONTRIBUTING.md).

## License

MIT
