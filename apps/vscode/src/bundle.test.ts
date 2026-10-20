// @vitest-environment node
/// <reference types="node" />
import { createRequire, isBuiltin } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

// `fileURLToPath(import.meta.url)` instead of `new URL(file, import.meta.url)`, which Vite rewrites
// into an asset URL.
const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, "../dist/extension.cjs");

interface Extension {
  activate(context: { extensionUri: unknown; subscriptions: unknown[] }): void;
}

async function buildHostBundle(): Promise<string> {
  // A computed specifier: the config is plain JS without types, and esbuild needs Node, not Vite.
  const configUrl = pathToFileURL(join(here, "../esbuild.config.mjs")).href;
  const { host } = await import(/* @vite-ignore */ configUrl);
  const esbuild = await import("esbuild");
  const result = await esbuild.build({
    ...host,
    write: false,
    sourcemap: false,
    logLevel: "silent",
  });
  const output = result.outputFiles?.[0];
  if (!output) throw new Error("esbuild produced no host bundle");
  return output.text;
}

/** Runs the bundle like VS Code does: `vscode` from the host, Node's built-ins, nothing else. */
function loadBundle(code: string, vscode: unknown): Extension {
  const nodeRequire = createRequire(bundlePath);
  const require = (id: string): unknown => {
    if (id === "vscode") return vscode;
    if (isBuiltin(id)) return nodeRequire(id);
    throw new Error(`the bundle requires "${id}" at runtime, which the VSIX doesn't ship`);
  };
  const module = { exports: {} };
  new Function("module", "exports", "require", "__filename", "__dirname", code)(
    module,
    module.exports,
    require,
    bundlePath,
    dirname(bundlePath),
  );
  return module.exports as Extension;
}

// The VSIX ships dist/extension.cjs without node_modules: a require esbuild left in the bundle
// throws on activation, and VS Code then waits forever for the custom editors.
describe("the extension host bundle", () => {
  it("loads on its own and registers both diagram editors", async () => {
    const registeredEditors: string[] = [];
    const disposable = { dispose: () => undefined };
    const vscode = {
      EventEmitter: class {
        event = () => disposable;
      },
      languages: { createDiagnosticCollection: () => disposable },
      window: {
        registerCustomEditorProvider: (viewType: string) => {
          registeredEditors.push(viewType);
          return disposable;
        },
      },
      commands: { registerCommand: () => disposable },
    };

    const extension = loadBundle(await buildHostBundle(), vscode);
    extension.activate({ extensionUri: {}, subscriptions: [] });

    expect(registeredEditors).toEqual(["teamTopologies.editor", "teamTopologies.pngEditor"]);
  }, 60_000);
});
