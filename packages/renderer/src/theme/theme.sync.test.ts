/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CD_TOKENS } from "./palette.js";

// Read the vendored token CSS from disk. `fileURLToPath(import.meta.url)` is used deliberately
// instead of `new URL('./file', import.meta.url)`, which Vite rewrites into an asset URL.
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "cd-tokens.generated.css"),
  "utf8",
);

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

describe("theme.sync — palette.ts mirrors cd-tokens.generated.css", () => {
  const root = readRootVars();

  it("declares every mirrored --cd-* token with the vendored value", () => {
    for (const [name, value] of Object.entries(CD_TOKENS)) {
      expect(root[name], `${name} in :root`).toBe(norm(value));
    }
  });
});
