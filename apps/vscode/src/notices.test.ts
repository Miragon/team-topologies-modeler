/// <reference types="node" />
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// `fileURLToPath(import.meta.url)` instead of `new URL(file, import.meta.url)`, which Vite rewrites
// into an asset URL.
const here = dirname(fileURLToPath(import.meta.url));

const script = join(here, "../scripts/third-party-notices.mjs");

// The VSIX bundles Lucide geometry, the Geist fonts and every npm package esbuild pulls in; their
// licenses must ship with it, so a dependency added or bumped without regenerating fails here.
describe("THIRD_PARTY_NOTICES.md", () => {
  it("lists the license of everything the bundles contain", async () => {
    await expect(promisify(execFile)(process.execPath, [script, "--check"])).resolves.toBeDefined();
  }, 60_000);
});
