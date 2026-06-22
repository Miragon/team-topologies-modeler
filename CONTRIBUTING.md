# Contributing

Thanks for helping improve the Team Topologies Modeler. This is an npm-workspaces monorepo
(Node ≥ 22.13, npm, TypeScript ESM). Agent-oriented notes live in [`CLAUDE.md`](CLAUDE.md).

## Setup & inner loop

```bash
npm install
npm run build   # builds packages/* (only needed to publish the libs; apps/tests use source)
npm test        # vitest run (unit)
npm run lint    # eslint . + type-check (same check the pre-commit hook runs)
```

Useful extras: `npm run dev:webapp`, `npm run dev:vscode`, `npm run depcruise` (module-graph check),
`npm run format` (Prettier).

### Named local URL via Portless (optional)

`npm run dev:webapp:portless` serves the webapp through [Portless](https://portless.sh) at a named
`.localhost` URL instead of a Vite port (needs **Node ≥ 24**). The URL is **per worktree**, not
static: the name is the git worktree's directory (`basename "$(git rev-parse --show-toplevel)"`) —
e.g. `puebla-v1.localhost` in a Conductor workspace, `team-topologies-modeler.localhost` in the main
checkout. That source works everywhere git does (no Conductor-only env var). Each worktree gets its
own URL, with no Vite port to remember and no collisions between parallel apps. On start it **opens
your browser** at that URL and prints it as a `➜ Portless:` line under Vite's output.

Portless needs a proxy daemon. There are two ways to get one:

- **Zero-setup (default in Conductor):** the Run script first starts an unprivileged proxy
  (`npx portless proxy start --port 1355 --no-tls`), so the app comes up immediately at
  `http://<worktree>.localhost:1355` — no sudo, browser opens, URL printed. The `:1355` port is the
  only cost.
- **Clean port-less HTTPS (one-time, recommended):** run the two commands below once. They bind port
  443 and trust a local CA (so **sudo** is required — Conductor's Run is non-TTY and can't prompt for
  it, which is why it isn't automatic). After this the same Run reuses the 443 proxy and the URL
  becomes `https://<worktree>.localhost` (no port):

  ```bash
  npx portless trust            # add the local CA to your system trust store
  npx portless service install  # run the HTTPS proxy as a background service (survives reboots)
  ```

Plain `npm run dev:webapp` (Vite on `:5181`) is unaffected and needs none of this.

## Browser & e2e tests

`npm run test:browser` (Vitest browser mode) and `npm run test:e2e` (Playwright, in `e2e/`) need a
Chromium browser. Locally, run `npx playwright install chromium` once. In CI these two jobs run inside
the official Playwright container (`mcr.microsoft.com/playwright`), which ships the browser + system
libs pre-installed — so **when you bump `playwright`/`@playwright/test`, bump the matching image tag
in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) too** (the version pin-check does not catch
this).

## Pre-commit reality

The Husky hook (`.husky/pre-commit`) runs **only** `lint-staged` + `npm run lint` — i.e. ESLint and
type-check. It does **not** run tests, the build, or dependency-cruiser. So before you push, run
`npm test` (and `npm run depcruise` if you touched imports) yourself. `git commit --no-verify` bypasses
the hook — avoid it.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/) — primarily `feat`, `fix`, `refactor`,
`chore`, `docs`.

```
feat(renderer): add a flow-of-change decorator
fix(schema-model): keep colours on the migration round-trip
docs: add contributing guide
```

## Monorepo map & the DOM boundary (P1)

| Package                                 | Purpose                                               | DOM      |
| --------------------------------------- | ----------------------------------------------------- | -------- |
| `@miragon/team-topologies-schema-model` | Types, notation spec, Zod validation, serialization   | DOM-free |
| `@miragon/team-topologies-renderer`     | diagram-js bootstrap, renderer, viewer, import/export | DOM      |
| `apps/webapp`                           | Vite + React demo editor                              | DOM      |
| `apps/vscode`                           | VS Code custom editor for `.tt`/`.ttm.json`           | DOM      |

**P1 — the DOM boundary:** the DOM-free package (`schema-model`) must **never** import
`diagram-js`/DOM libraries (`tiny-svg`, `min-dom`) or use the DOM (`window`/`document`). This is
enforced twice — by ESLint (`no-restricted-imports`/`no-restricted-globals`) **and** by
dependency-cruiser — so a violating import fails `npm run lint` and `npm run depcruise`.

Also keep JSON serialization deterministic.

## Pull requests

- Keep PRs small and focused.
- Make sure local gates are green: `npm run lint`, `npm test`, `npm run depcruise`, `npm run build`.
