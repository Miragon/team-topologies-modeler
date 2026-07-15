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

The brand tokens are **vendored** from that skill as
[`packages/renderer/src/theme/cd-tokens.generated.css`](packages/renderer/src/theme/cd-tokens.generated.css)
— do **not** fork the hex values; re-copy the file from the skill to update. The pure-TS mirror in
[`packages/renderer/src/theme/palette.ts`](packages/renderer/src/theme/palette.ts) is the single
source for canvas colours; a drift test (`packages/renderer/test/theme.sync.test.ts`) fails if the
two diverge. The four Team Topologies team-type / interaction colours in
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
| `apps/webapp`                           | Vite + React demo editor                                                 | yes |
| `apps/vscode`                           | VS Code extension: custom editor for `.tt`/`.ttm.json`                   | yes |

**P1 — DOM boundary:** the DOM-free package (`schema-model`) must **never** import `diagram-js`/DOM
libraries (`tiny-svg`, `min-dom`) or use the DOM (`window`/`document`). Enforced twice — ESLint
(`no-restricted-imports`/`no-restricted-globals`) **and** `dependency-cruiser` — so a violating import
fails `npm run lint` and `npm run depcruise`.

## Commands

- `npm run build` — packages (schema-model, then renderer) · `npm run build:webapp` ·
  `npm run build:vscode`
- `npm run dev:webapp` (alias: `npm run dev`) serves the webapp via [Portless](https://portless.sh)
  at a stable per-worktree `https://<worktree>.team-topologies-modeler.localhost` URL (Portless-derived
  from the git worktree; config in [`apps/webapp/portless.json`](apps/webapp/portless.json); needs
  Node ≥ 24 + a one-time `npx portless service install` — see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
  `npm run dev:webapp:plain` for plain Vite on `:5181`. · `npm run dev:vscode`
- `npm test` — Vitest (unit) · `npm run test:browser` — renderer in Chromium · `npm run test:e2e`
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
- Contributor onboarding in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Code Style

- Write comments only when explicitly requested. Otherwise write self-explanatory code — descriptive
  function and parameter names, no abbreviations.
- If comments are needed: make them **WHY**-driven, not **HOW**.
