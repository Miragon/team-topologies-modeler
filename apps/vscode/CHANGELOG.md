# Changelog

## 0.1.0 — Unreleased

Initial VS Code extension.

- Custom text editor for `.tt` / `.ttm.json` (native JSON document) with the diagram-js Team
  Topologies `Modeler`.
- Two-way sync between the text document and the graphical canvas (echo-guarded).
- Collapsed menu (top-right): fit-to-view · export SVG/PNG. Undo/redo is left to VS Code /
  `Ctrl/Cmd+Z` (no buttons).
- SVG/PNG export with the scene embedded for round-trip reopening.
- **Editable embedded-PNG diagrams** (`*.tt.png` / `*.ttm.png`): a binary custom editor opens these
  files directly, reads the Team Topologies diagram from the embedded `tEXt` chunk, and on save
  re-renders the PNG with the updated diagram embedded again — the file stays a normal, shareable
  PNG.
- Commands: **New Empty Diagram**, **New Diagram from Example**, **New Empty Diagram (embedded
  PNG)**.
