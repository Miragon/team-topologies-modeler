/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { CD_TOKENS, MIRAGON } from "./palette.js";

/**
 * Drift guard for the design system (CLAUDE.md § "Design system (mandatory)"): the three vendored
 * files are unchanged copies of one design-system release, `palette.ts` mirrors their values, and
 * the renderer stylesheet takes every colour from the `--cd-ui-*` roles, so the canvas chrome
 * follows the mode with the host's chrome. Re-copying the files from the skill changes their
 * hashes on purpose: update them here together with the release name.
 */

// `fileURLToPath(import.meta.url)` instead of `new URL('./file', import.meta.url)`, which Vite
// rewrites into an asset URL.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../../..");
const read = (file: string): string => readFileSync(join(here, file), "utf8");

const tokensCss = read("cd-tokens.generated.css");
const canvasCss = read("cd-canvas.css");
const tokensJson = read("cd-tokens.generated.json");
const rendererCss = read("../assets/team-topologies.css");

interface VendoredTokens {
  $description: string;
  hell: Record<string, string>;
  dunkel: Record<string, string>;
  hochkontrast: { hell: Record<string, string>; dunkel: Record<string, string> };
  fest: Record<string, string>;
  shell: Record<string, string>;
}
const tokens = JSON.parse(tokensJson) as VendoredTokens;

/** sha256 of the files of design system 1.13.0 (skill `miragon-brand:modeler-tool-design`). */
const DESIGN_SYSTEM_1_13_0: Record<string, string> = {
  "cd-tokens.generated.css": "36ccd5bbcb732c57143e32f13172967467dd574ae1ac5d84d6c601d0ab0847a1",
  "cd-tokens.generated.json": "549a244fba0951e9b77fed0f5d2172cb793191913326f08749e167ac7fdbb127",
  "cd-canvas.css": "4c5231402d0764b09c4b978140759ed1b0afdd7cebc4cd2ebd1ff82253928664",
};

/** Colours by meaning, not bytes: hex case and whitespace inside `rgba(…)` do not count. */
function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The `--name: value;` declarations of the first rule whose selector list ends with `selector`. */
function readVars(source: string, selector: string): Record<string, string> {
  const block = new RegExp(`${escapeForRegExp(selector)}\\s*\\{([^}]*)\\}`).exec(source);
  if (!block) throw new Error(`selector not found: ${selector}`);
  const vars: Record<string, string> = {};
  for (const match of block[1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]!] = norm(match[2]!);
  }
  return vars;
}

/** Every custom property the vendored CSS declares, in any block and any mode. */
function declaredTokens(): Set<string> {
  return new Set(
    [...`${tokensCss}\n${canvasCss}`.matchAll(/(--cd-[\w-]+)\s*:/g)].map((match) => match[1]!),
  );
}

function normalized(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, norm(value)]));
}

/** The CSS without comments: what the browser parses. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Every selector of every rule (the text in front of a `{`, split at the commas). */
function ruleSelectors(source: string): string[] {
  return [...withoutComments(source).matchAll(/([^{};]+)\{/g)].flatMap((match) =>
    match[1]!.split(",").map((selector) => selector.trim()),
  );
}

const STYLED_SOURCE_DIRS = [
  "packages/renderer/src",
  "packages/ui/src",
  "apps/webapp/src",
  "apps/vscode/src",
];
const STYLED_SOURCE_FILE = /\.(css|tsx?)$/;
const TEST_FILE = /\.(test|spec)\.tsx?$/;

/** Every stylesheet and TS(X) source that can reference `var(--cd-*)` in chrome or inline styles. */
function styledSourceFiles(): string[] {
  return STYLED_SOURCE_DIRS.flatMap((directory) =>
    readdirSync(join(repoRoot, directory), { recursive: true })
      .map(String)
      .filter((file) => STYLED_SOURCE_FILE.test(file) && !TEST_FILE.test(file))
      .filter(
        (file) => !file.endsWith("cd-tokens.generated.css") && !file.endsWith("cd-canvas.css"),
      )
      .map((file) => join(repoRoot, directory, file)),
  );
}

describe("theme.sync — the vendored files are unchanged copies of design system 1.13.0", () => {
  for (const [file, hash] of Object.entries(DESIGN_SYSTEM_1_13_0)) {
    it(`${file} is byte-identical to the release`, () => {
      expect(
        createHash("sha256")
          .update(readFileSync(join(here, file)))
          .digest("hex"),
      ).toBe(hash);
    });
  }

  it("the JSON `hell` roles equal the light roles in the CSS", () => {
    const root = readVars(tokensCss, ":root");
    const light = readVars(tokensCss, '[data-cd-theme="light"],\n[data-cd-theme="system"]');
    expect(Object.keys(tokens.hell).length).toBeGreaterThan(20);
    for (const [name, value] of Object.entries(tokens.hell)) {
      expect(root[name], `${name} on :root`).toBe(norm(value));
    }
    expect(light).toEqual(expect.objectContaining(normalized(tokens.hell)));
  });

  it("the JSON `fest` and `shell` tokens equal the fixed tokens on :root", () => {
    const root = readVars(tokensCss, ":root");
    for (const [name, value] of Object.entries({ ...tokens.fest, ...tokens.shell })) {
      expect(root[name], `${name} on :root`).toBe(norm(value));
    }
  });
});

describe("theme.sync — palette.ts mirrors the vendored tokens", () => {
  it("declares every mirrored --cd-* token with the vendored value", () => {
    const root = readVars(tokensCss, ":root");
    for (const [name, value] of Object.entries(CD_TOKENS)) {
      expect(root[name], `${name} in :root`).toBe(norm(value));
    }
  });

  it("the status colours are the release's status layer", () => {
    expect(MIRAGON.success).toBe(tokens.fest["--cd-success"]);
    expect(MIRAGON.warning).toBe(tokens.fest["--cd-warning"]);
    expect(MIRAGON.danger).toBe(tokens.fest["--cd-danger"]);
    expect(MIRAGON.info).toBe(tokens.fest["--cd-info"]);
  });

  // A var() pointing at a token the vendored files lack is invalid at computed-value time and
  // silently falls back (e.g. a border to currentColor), so nothing else would catch it.
  it("declares every --cd-* token the renderer, ui and app sources reference", () => {
    const declared = declaredTokens();
    const files = styledSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const [, name] of text.matchAll(/var\(\s*(--cd-[\w-]+)/g)) {
        expect(declared.has(name!), `${name} used in ${relative(repoRoot, file)}`).toBe(true);
      }
    }
  });
});

describe("theme.sync — team-topologies.css takes every colour from the roles", () => {
  it("loads the tokens, diagram-js and cd-canvas.css first, in this order (guide §10.3)", () => {
    const statements = withoutComments(rendererCss)
      .split(/;|\{/)
      .map((statement) => statement.trim().replace(/\s+/g, " "));
    expect(statements.slice(0, 3)).toEqual([
      '@import "../theme/cd-tokens.generated.css"',
      '@import "diagram-js/assets/diagram-js.css"',
      '@import "../theme/cd-canvas.css"',
    ]);
    expect(rendererCss.match(/@import/g)).toHaveLength(3);
  });

  it("declares no colour literal: no hex, rgb() or hsl() value", () => {
    expect(withoutComments(rendererCss)).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  it("reads only roles and mode-independent tokens, never a fixed palette colour", () => {
    const used = [...withoutComments(rendererCss).matchAll(/var\((--cd-[\w-]+)/g)].map(
      (match) => match[1]!,
    );
    expect(used.length).toBeGreaterThan(20);
    for (const token of used) {
      expect(token).toMatch(/^--cd-(ui-[\w-]+|radius-\w+|shadow-\d|ease(-out)?|motion-\w+)$/);
    }
  });

  it("leaves the diagram-js variables to cd-canvas.css (guide §10.3, §10.4)", () => {
    expect(withoutComments(rendererCss)).not.toMatch(
      /--(lasso-fill-color|canvas-fill-color|resizer-[\w-]+|element-selected-outline[\w-]*|hover-tooltip-[\w-]+|palette-[\w-]+-color)\s*:/,
    );
  });

  it("keeps every own palette rule off a palette the host chrome skins", () => {
    const paletteSelectors = ruleSelectors(rendererCss).filter((selector) =>
      /\.djs-palette(?![\w-])/.test(selector),
    );
    expect(paletteSelectors.length).toBeGreaterThan(5);
    for (const selector of paletteSelectors) {
      expect(selector).toMatch(
        /^(\[data-cd-kontrast="hoch"\] )?(\.tt-djs-container )?\.djs-palette:not\(\[data-chrome="palette"\]\)($|[\s.:])/,
      );
    }
  });

  it("keeps its own overlays inside the canvas at z-index 100 or below (guide §5.13)", () => {
    const zIndexOf = (selector: string): number => {
      const rule = new RegExp(`${escapeForRegExp(selector)}\\s*\\{([^}]*)\\}`).exec(
        withoutComments(rendererCss),
      );
      return Number(/z-index:\s*(\d+)/.exec(rule?.[1] ?? "")?.[1]);
    };
    expect(zIndexOf('.tt-djs-container .djs-palette:not([data-chrome="palette"])')).toBe(110);
    expect(zIndexOf(".tt-djs-container .tt-label-editor")).toBeLessThanOrEqual(100);
  });
});
