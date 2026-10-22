# CLAUDE.md

TypeScript modeler for the [Team Topologies](https://teamtopologies.com/) notation (the four team
types, the three team-interaction modes, and flow-of-change), built on
[diagram-js](https://github.com/bpmn-io/diagram-js) (MIT). Shared core for two targets: a web app and
a VS Code extension.

## Design system (mandatory)

All UI/visual work MUST follow the Miragon product design system — this is not optional. Source of
truth: the **`miragon-brand:modeler-tool-design`** Claude skill in
[`Miragon/corporate-identity`](https://github.com/Miragon/corporate-identity). It auto-loads when the
plugin is installed; otherwise read the guide directly:
<https://raw.githubusercontent.com/Miragon/corporate-identity/main/plugins/miragon-brand/skills/modeler-tool-design/assets/modeler-design-system.md>.

Install the plugin with `/plugin marketplace add Miragon/corporate-identity` +
`/plugin install miragon-brand@miragon`.

The design system **1.13.0** is **vendored** from that skill, byte-identical:
[`packages/renderer/src/theme/cd-tokens.generated.css`](packages/renderer/src/theme/cd-tokens.generated.css),
`cd-tokens.generated.json` and `cd-canvas.css` — do **not** fork or reformat them; re-copy all three
from the skill to update and update their hashes in the drift test
(`packages/renderer/src/theme/theme.sync.test.ts`), which also checks that
[`palette.ts`](packages/renderer/src/theme/palette.ts) (the pure-TS mirror for canvas colours) and the
vendored files agree and that `team-topologies.css` reads only `--cd-ui-*` roles and, built, keeps the
tokens in the cascade layer `team-topologies-tokens` (so a host page's own tokens win) with
`cd-canvas.css` unlayered.
`apps/vscode/src/tokens.sync.test.ts` pins the shell's sizes (`SHELL`) to the JSON's `shell` group.

**Chrome:** both apps run on [`@miragon/modeler-shell`](https://www.npmjs.com/package/@miragon/modeler-shell):
the VS Code webview on its IDE host, the web app on its web host. Shared: menu, palette skin, zoom
panel and keys, fit, problems pill, status box, legend and inspector slots, `themes: ["light"]` until
the shared dark mode (VS Code: theme bridge and empty-file hint; web: Share as primary action, legal
line, toasts, problems list, start screen, drop zone and the head markup from `vite.config.ts`). The
renderer implements the canvas rules it asks for (keyboard creation, the `ttReadOnly` lock, no zoom
keys, `undoRedoKeys: false` in VS Code) and the `@miragon/modeler-api` contract
(`createCollaborativeModeler`, its conformance kit in `npm run test:browser`). The shell's own
conformance kit runs in both e2e projects, `webapp` and `vscode-webview`. The four Team Topologies team-type / interaction colours in
[`packages/schema-model/src/notation.ts`](packages/schema-model/src/notation.ts) are the **official
notation** (Team-Shape-Templates) and are serialized into documents — they stay as-is; the CI applies
to everything else (chrome, typography, accent/selection, neutrals, the app icon).

## Monorepo (npm workspaces)

Workspaces are declared in the root `package.json` (`workspaces` array, listed in topological build
order). **All** versions are pinned to exact values inline in each package's `package.json` (`.npmrc`
sets `save-exact=true`) — including internal `@miragon/team-topologies-*` deps, which use the exact local version
`0.1.0` (npm still links them to the local workspace). Exact pinning is enforced in CI by the
`pin-check` job.

| Package                                 | Purpose                                                                  | DOM |
| --------------------------------------- | ------------------------------------------------------------------------ | --- |
| `@miragon/team-topologies-schema-model` | Types, the notation spec, Zod validation, migrations, JSON serialization | no  |
| `@miragon/team-topologies-renderer`     | diagram-js bootstrap, renderer, viewer/modeler, import/export, CSS       | yes |
| `@miragon/team-topologies-ui` (private) | chrome content (inspector, legend rows, dialogs, menu entries)           | yes |
| `apps/webapp`                           | Vite demo editor on the modeler shell's web host                         | yes |
| `apps/vscode`                           | VS Code extension: custom editor for `.tt`/`.ttm.json`                   | yes |

**P1 — DOM boundary:** the DOM-free package (`schema-model`) must **never** import `diagram-js`/DOM
libraries (`tiny-svg`, `min-dom`) or use the DOM (`window`/`document`). Enforced twice — ESLint
(`no-restricted-imports`/`no-restricted-globals`) **and** `dependency-cruiser` — so a violating import
fails `npm run lint` and `npm run depcruise`.

The `ui` package is consumed from source only (no build, not published). It holds what the modeler
puts into a host's chrome — the inspector (React, mounted into the shell's inspector slot), the legend
rows, the "Keyboard shortcuts…" and "Diagram title…" dialogs and the menu entries — ships its styles
as `@miragon/team-topologies-ui/ui.css` (role aliases, buttons, fields, the content of inspector,
legend and dialog; where they sit is the host's), and must never import from `apps/**`;
`schema-model` and `renderer` must never import it, nor `@miragon/modeler-shell` (all enforced by
`dependency-cruiser`; `schema-model` takes only types from `@miragon/modeler-api`).

## Commands

- `npm run build` — packages (schema-model, then renderer) · `npm run build:webapp` ·
  `npm run build:vscode`
- `npm run dev:webapp` (alias: `npm run dev`) serves the webapp via [Portless](https://portless.sh)
  at a stable per-worktree `https://<worktree>.team-topologies-modeler.localhost` URL (Portless-derived
  from the git worktree; config in [`apps/webapp/portless.json`](apps/webapp/portless.json); needs
  Node ≥ 24 + a one-time `npx portless service install` — see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
  `npm run dev:webapp:plain` for plain Vite on `:5181`. · `npm run dev:vscode`
- `npm test` — Vitest (unit) · `npm run test:browser` — renderer and the contract kit in Chromium ·
  `npm run test:e2e` — Playwright, projects `webapp` and `vscode-webview` (ports `E2E_PORT`,
  `E2E_WEBVIEW_PORT`)
- `npm run test:vscode` — the packed extension in a real VS Code (Vitest project `vscode`,
  `apps/vscode/test-smoke/`, the shell's `./testing/vscode-electron`): open, edit, save, undo and
  the four default themes, screenshots in `test-results/vscode-smoke/`. Opt-in: it opens a VS Code
  window (on Linux without a display: `xvfb-run -a`) and downloads VS Code once into the OS cache.
  **Run it locally as `npm run test:vscode:docker`** (the shell's `modeler-shell-vscode-docker`,
  needs Docker): the same test in a Linux container under `xvfb-run -a`, so no window opens and
  takes the user's focus; it runs `npm ci` in the container and copies `test-results/vscode-smoke/`
  back. The root `package.json` declares the shell itself so the bin resolves at the root; keep its
  pin equal to the workspaces'. CI runs `test:vscode` directly under `xvfb-run -a`, only in
  [`vscode-smoke.yml`](.github/workflows/vscode-smoke.yml) (on demand, weekly, on PRs touching
  `apps/vscode/**`, the root `package.json` or `vitest.config.ts`), never in `ci.yml`. See
  [`CONTRIBUTING.md`](CONTRIBUTING.md).
- `npm run typecheck` · `npm run lint` (ESLint + typecheck)
- `npm run format` — Prettier · `npm run depcruise` — check the module graph

Requirements: Node ≥ 22.13, npm. The packages are consumed from **source** (Vite/esbuild/tsconfig
aliases), so neither the apps nor the tests need a prior package build; `npm run build` is for
publishing the libraries. The Husky pre-commit hook runs **only** lint-staged + `npm run lint`
(ESLint + type-check) — **not** tests/build/depcruise; run `npm test` yourself before pushing.

## Git

Everything is managed via **Conventional Commits** — primarily `feat`, `fix`, `refactor`, `chore`,
`docs`. Example: `feat(renderer): add a context-pad colour picker`.

## Conventions

- Keep the core package (`schema-model`) strictly DOM-free (P1, above).
- JSON serialization must stay deterministic (sorted, rounded, version-stamped) so diffs and share
  URLs stay stable.
- Pin **all** dependencies to exact versions — no version ranges (`^`/`~`/`>=`/`*`), internal
  workspace deps included (use `0.1.0`). See
  [`.claude/rules/package-json-fixed-versions.md`](.claude/rules/package-json-fixed-versions.md).
- The repo's Claude skills ship as the **`team-topologies-modeler` plugin**
  ([`plugins/team-topologies-modeler/`](plugins/team-topologies-modeler/)) via the marketplace in
  [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json): `team-topologies` for the
  method, `tt-format` for the file format plus its checker (`skills/tt-format/scripts/check.mjs`).
  The checker hand-mirrors `schema-model` (notation sizes, schema, serializer) — when you change
  those, update it; `packages/schema-model/src/plugin-check.sync.test.ts` fails on drift. Install
  with `/plugin marketplace add Miragon/team-topologies-modeler` and
  `/plugin install team-topologies-modeler@team-topologies`; the skill files are readable directly
  under `plugins/team-topologies-modeler/skills/` either way.
- Contributor onboarding in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Code Style

- Write comments only when explicitly requested. Otherwise write self-explanatory code — descriptive
  function and parameter names, no abbreviations.
- If comments are needed: make them **WHY**-driven, not **HOW**.
