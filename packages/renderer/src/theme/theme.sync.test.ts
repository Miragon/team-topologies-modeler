/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { CD_TOKENS } from "./palette.js";

// Read the vendored token CSS from disk. `fileURLToPath(import.meta.url)` is used deliberately
// instead of `new URL('./file', import.meta.url)`, which Vite rewrites into an asset URL.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../../..");
const css = readFileSync(join(here, "cd-tokens.generated.css"), "utf8");

/**
 * Drift guard: `palette.ts` (the pure-TS single source of truth for canvas colours) hand-mirrors the
 * vendored `--cd-*` brand tokens. This test parses `cd-tokens.generated.css` and fails the moment a
 * mirrored value diverges from the vendored CSS — so re-copying the token file from the
 * `miragon-brand:modeler-tool-design` skill with a changed value forces `MIRAGON`/`CD_TOKENS` to be
 * updated too, instead of silently drifting. See CLAUDE.md § "Design system (mandatory)".
 */
/** Pull the `--name: value;` declarations out of the `:root { … }` block. */
function readRootVars(): Record<string, string> {
  const block = /:root[^{}]*\{([^}]*)\}/.exec(css);
  if (!block) throw new Error("no :root block in cd-tokens.generated.css");
  const vars: Record<string, string> = {};
  for (const m of block[1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]!] = norm(m[2]!);
  }
  return vars;
}

/**
 * Compare colours by meaning, not bytes: ignore hex case and internal whitespace (Prettier may
 *  reformat), so only a real value change fails.
 */
function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

const STYLED_SOURCE_DIRS = ["packages/renderer/src", "apps/webapp/src", "apps/vscode/src"];
const STYLED_SOURCE_FILE = /\.(css|tsx?)$/;
const TEST_FILE = /\.(test|spec)\.tsx?$/;

/** Every stylesheet and TS(X) source that can reference `var(--cd-*)` in chrome or inline styles. */
function styledSourceFiles(): string[] {
  return STYLED_SOURCE_DIRS.flatMap((directory) =>
    readdirSync(join(repoRoot, directory), { recursive: true })
      .map(String)
      .filter((file) => STYLED_SOURCE_FILE.test(file) && !TEST_FILE.test(file))
      .filter((file) => !file.endsWith("cd-tokens.generated.css"))
      .map((file) => join(repoRoot, directory, file)),
  );
}

describe("theme.sync — palette.ts mirrors cd-tokens.generated.css", () => {
  const root = readRootVars();

  it("declares every mirrored --cd-* token with the vendored value", () => {
    for (const [name, value] of Object.entries(CD_TOKENS)) {
      expect(root[name], `${name} in :root`).toBe(norm(value));
    }
  });

  // A var() pointing at a token the vendored file lacks is invalid at computed-value time and
  // silently falls back (e.g. a border to currentColor), so nothing else would catch it.
  it("declares every --cd-* token the renderer and app sources reference", () => {
    const files = styledSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const [, name] of text.matchAll(/var\(\s*(--cd-[\w-]+)/g)) {
        expect(root[name!], `${name} used in ${relative(repoRoot, file)}`).toBeDefined();
      }
    }
  });
});
