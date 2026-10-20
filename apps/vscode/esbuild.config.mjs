// Two bundles from one run:
//   1. Extension host  (Node/CJS, `vscode` external)  -> dist/extension.cjs
//   2. Webview          (Browser/IIFE, Modeler + modeler shell + React inspector + CSS)
//                       -> dist/webview.js (+ dist/webview.css, Geist font files in dist/fonts/)
//
// Like the demo webapp, we bundle the @miragon/team-topologies-* packages straight from SOURCE (aliased to
// src/index.ts; the ui package's own `exports` already point there). That makes the build
// self-contained: no prior lib build needed, and the diagram-js imports resolve relative to the
// renderer source (packages/renderer/node_modules). @miragon/modeler-shell comes from node_modules
// in both bundles.
import * as esbuild from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const watch = process.argv.includes("--watch");
const production = process.argv.includes("--production");

const r = (p) => resolve(root, p);

/** Package aliases pointing at the TS source (mirrors apps/webapp/vite.config.ts). */
const alias = {
  "@miragon/team-topologies-renderer": r("packages/renderer/src/index.ts"),
  "@miragon/team-topologies-schema-model": r("packages/schema-model/src/index.ts"),
};

/**
 * Two copies of React in one bundle break every hook ("Invalid hook call"). The ui package is
 * bundled from its source folder, so a nested copy there would win over the root one without this
 * (the webapp's Vite config dedupes the same way).
 */
const webAlias = {
  ...alias,
  react: r("node_modules/react"),
  "react-dom": r("node_modules/react-dom"),
};

/**
 * `import url from "file?dataurl"` inlines that one file as a data: URL, while every other import of
 * the same file type keeps its loader. The PNG export needs Geist inline: an SVG drawn as an image
 * can't load the webview's font files.
 * @type {import('esbuild').Plugin}
 */
const dataUrlImports = {
  name: "dataurl-imports",
  setup(build) {
    build.onResolve({ filter: /\?dataurl$/ }, async (args) => {
      const resolved = await build.resolve(args.path.slice(0, -"?dataurl".length), {
        kind: args.kind,
        resolveDir: args.resolveDir,
      });
      if (resolved.errors.length > 0) return { errors: resolved.errors };
      return { path: resolved.path, namespace: "dataurl" };
    });
    build.onLoad({ filter: /.*/, namespace: "dataurl" }, async (args) => ({
      contents: await readFile(args.path),
      loader: "dataurl",
    }));
  },
};

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: "info",
};

/** @type {import('esbuild').BuildOptions} */
export const host = {
  ...common,
  entryPoints: [resolve(here, "src/extension.ts")],
  outfile: resolve(here, "dist/extension.cjs"),
  platform: "node",
  format: "cjs",
  // VS Code 1.96 (engines) runs extensions on Node 20; the shell's createNonce needs its
  // globalThis.crypto.
  target: "node20",
  alias,
  // `vscode` is only available at runtime (from the host) and must not be bundled.
  external: ["vscode"],
};

/** @type {import('esbuild').BuildOptions} */
export const web = {
  ...common,
  entryPoints: [resolve(here, "src/webview/main.ts")],
  outfile: resolve(here, "dist/webview.js"),
  platform: "browser",
  format: "iife",
  target: "es2022",
  alias: webAlias,
  // The shared ui package is React source compiled here, so JSX needs the automatic runtime.
  jsx: "automatic",
  define: { "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development") },
  // Geist and Geist Mono are self-hosted (no CDN, offline): the font files ship next to the bundle,
  // inside the webview's localResourceRoots, so the CSP's `font-src ${webview.cspSource}` covers
  // them, and the browser fetches only the subsets a page's unicode-range needs.
  loader: { ".woff2": "file", ".woff": "file" },
  assetNames: "fonts/[name]-[hash]",
  plugins: [dataUrlImports],
};

// The options are also read by scripts/third-party-notices.mjs; only a direct run builds.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (watch) {
    const ctxs = await Promise.all([esbuild.context(host), esbuild.context(web)]);
    await Promise.all(ctxs.map((c) => c.watch()));
    console.log("[tt-vscode] watching …");
  } else {
    await Promise.all([esbuild.build(host), esbuild.build(web)]);
    console.log("[tt-vscode] build done");
  }
}
