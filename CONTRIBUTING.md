# Contributing

Thanks for helping improve the Team Topologies Modeler. This is an npm-workspaces monorepo
(Node ≥ 22.13, npm, TypeScript ESM). Agent-oriented notes live in [`CLAUDE.md`](CLAUDE.md).

## External contributions

We're currently not accepting pull requests from outside the team. We don't have the resources to fully review and validate external contributions, so we can't guarantee that a merged change keeps the project free of bugs, free of security vulnerabilities or malicious code, and consistent with requirements that make sense for it. Pull requests opened by external contributors will be closed.

If you've found a bug or have an idea, please [open an issue](https://github.com/Miragon/team-topologies-modeler/issues/new) instead. We read every one, and it's the best way to get something onto our radar.

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

`npm run test:browser` (Vitest browser mode, including the `@miragon/modeler-api` conformance kit)
and `npm run test:e2e` (Playwright, in `e2e/`) need a Chromium browser. The e2e suite has two
projects: `webapp` (the web app's dev server, port `E2E_PORT`, default 5180, with the shell's
conformance kit on its web host) and `vscode-webview`
(the VS Code webview inside the modeler shell's VS Code stub, port `E2E_WEBVIEW_PORT`, default 5190,
with the shell's conformance kit and a CSP smoke test of the production bundle); set both ports when
several worktrees run the suite at once. Locally, run `npx playwright install chromium` once. In CI these two jobs run inside
the official Playwright container (`mcr.microsoft.com/playwright`), which ships the browser + system
libs pre-installed — so **when you bump `playwright`/`@playwright/test`, bump the matching image tag
in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) too** (the version pin-check does not catch
this), and keep `playwright-core` on the same version.

### The extension in a real VS Code

`npm run test:vscode` (the Vitest project `vscode`,
[`apps/vscode/test-smoke/`](apps/vscode/test-smoke/vscode-smoke.test.ts)) runs the extension the way
it ships in a real VS Code, driven by `@miragon/modeler-shell/testing/vscode-electron`: it packs the
VSIX like the release (`vsce package`, which runs `vscode:prepublish`, the production build, into
`apps/vscode/dist`), unpacks it, checks that the package holds every file the webview loads (bundle,
stylesheet, fonts), starts the newest stable VS Code with it on a throwaway profile, opens a small
diagram ([`checkout.tt`](apps/vscode/test-smoke/checkout.tt)) in the custom editor and waits until
the canvas shows it with the stylesheet applied, creates a team from the palette by keyboard, saves
(once the tab is clean and the file on disk holds still, it must pass the Problems view's check),
undoes (the canvas and, saved again, the file return to the fixture) and switches through VS Code's
four default themes, with a screenshot each in `test-results/vscode-smoke/` (gitignored). It is not
part of `npm test` or the regular CI (`ci.yml`): it needs a display and the VS Code download.

**Locally, without a window:** run it in Docker. `npm run test:vscode:docker` runs
`npm run test:vscode` in a Linux container under `xvfb-run -a` (the shell's
`modeler-shell-vscode-docker`), so no VS Code window opens and nothing takes the focus while you
work. It needs only Docker (Docker Desktop on macOS). It copies your working copy, uncommitted
changes included, into the container without `node_modules` and `.git`, runs `npm ci` there (your
`node_modules` stay as they are) and copies `test-results/vscode-smoke/` back. The first run builds
a local image (`modeler-shell-vscode-smoke:node<version>-…`, about 0.9 GB, on the Node version that
runs the command; `npm run test:vscode:docker -- --node 22.13.0` picks another) and downloads
VS Code into the Docker volume `modeler-shell-vscode-cache`; both are kept and shared by every
Miragon modeler on the machine, and a run then takes about 12 to 20 s on an Apple silicon Mac,
`npm ci` included. Paths in the test's output are the container's (`/work/…`). The root
`package.json` declares `@miragon/modeler-shell` itself, at the workspaces' exact version, so the
command (and the CI workflow's import of the driver) finds the shell at the root whatever npm
hoists; bump all five pins together.

```bash
npm run test:vscode:docker
```

**Locally, with a window:** `npm run test:vscode` runs it on your machine; on macOS a VS Code window
opens for a few seconds and takes the focus, and the whole run takes about 5 to 10 s. The first run
downloads VS Code (about 320 MB, 0.9 GB unpacked) into
`~/Library/Caches/miragon-modeler-shell/vscode-test`, shared by every Miragon modeler on the machine
and outside the repository; let that first download finish before you start a second run anywhere
(the same holds for the Docker volume). On Linux, run it under `xvfb-run -a` when there is no
display.

```bash
npm run test:vscode
```

A file missing from the package fails the test before VS Code starts, with its path. Any other
failure names its step (`open`, `edit`, `save`, `undo`, `themes`, …) in the test's output. To read
VS Code's own logs, pass `keepTemporaryFiles: true` to `runVsCodeSmoke` for that run; it then logs
where the profile is (in Docker, the logs come back in `test-results/vscode-smoke/vscode-logs/`).

**In CI:** the [`VS Code smoke`](.github/workflows/vscode-smoke.yml) workflow runs
`npm run test:vscode` directly on `ubuntu-latest` under `xvfb-run -a` — on demand (Actions → VS Code
smoke → Run workflow), every Monday against the newest stable VS Code, and on pull requests that
change `apps/vscode/**`, the root `package.json` (its scripts, the driver's peers `playwright-core`
and `@vscode/test-electron`) or `vitest.config.ts`. It is a workflow of its own and not a required
check, so it never slows down or blocks the regular CI; it caches the VS Code download per version
and uploads the screenshots as the artifact `vscode-smoke` (kept 7 days). It does not use the Docker
mode: a runner has no window to keep out of the way, and the container would build its image and
install the dependencies again on every run.

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
| `@miragon/team-topologies-ui` (private) | Chrome content: inspector, legend rows, dialogs, menu | DOM      |
| `apps/webapp`                           | Vite demo editor on the modeler shell's web host      | DOM      |
| `apps/vscode`                           | VS Code custom editor for `.tt`/`.ttm.json`           | DOM      |

**P1 — the DOM boundary:** the DOM-free package (`schema-model`) must **never** import
`diagram-js`/DOM libraries (`tiny-svg`, `min-dom`) or use the DOM (`window`/`document`). This is
enforced twice — by ESLint (`no-restricted-imports`/`no-restricted-globals`) **and** by
dependency-cruiser — so a violating import fails `npm run lint` and `npm run depcruise`.

Also keep JSON serialization deterministic.

## Pull requests

- Keep PRs small and focused.
- Make sure local gates are green: `npm run lint`, `npm test`, `npm run depcruise`, `npm run build`.
