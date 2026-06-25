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

### Named local URL via Portless

`npm run dev:webapp` (and the top-level `npm run dev`) serves the webapp through
[Portless](https://portless.sh) at a stable, named `.localhost` URL instead of a Vite port
(needs **Node ≥ 24**). Portless is a pinned **devDependency**, so `npm install` is all you need — no
global install. Config lives in [`apps/webapp/portless.json`](apps/webapp/portless.json)
(`{ "name": "team-topologies-modeler", "script": "dev:app" }`): `npm run dev:webapp` runs bare
`portless`, which starts the real Vite server (the `dev:app` script) behind the proxy. `dev:app` binds
`--host 127.0.0.1` (Portless can't proxy the IPv6 `::1` that `localhost` resolves to on macOS) and
`--port ${PORT}` (the ephemeral port Portless injects), and `vite.config.ts` sets
`allowedHosts: ['.localhost']` so Vite accepts the proxied Host header.

The URL is **per worktree** and Portless-derived — never hand-built: in a linked git worktree it
prepends the branch as a subdomain, so you get `https://<worktree>.team-topologies-modeler.localhost`
in a Conductor workspace and `https://team-topologies-modeler.localhost` in the main checkout. Each
worktree gets its own URL, so parallel apps never collide. On start Portless **opens your browser**
there and prints it as a `➜ Portless:` line under Vite's output.

Portless needs an HTTPS proxy daemon on port 443, installed once per machine (it binds 443 and trusts
a local CA, so it needs **sudo** — which is also why Conductor's non-TTY Run button can't do it for
you):

```bash
npx portless trust            # add the local CA to your system trust store
npx portless service install  # run the HTTPS proxy as a background service (survives reboots)
```

Prefer a plain Vite server with no proxy? `npm run dev:webapp:plain` (or
`npm run dev:app -w apps/webapp`) runs Vite directly on `:5181` and needs none of the above.

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
