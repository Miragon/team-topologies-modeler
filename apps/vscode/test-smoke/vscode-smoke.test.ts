/// <reference types="node" />
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  formatVsCodeSmoke,
  runVsCodeSmoke,
  VSCODE_COLOR_THEMES,
  type VsCodeSmokeContext,
} from "@miragon/modeler-shell/testing/vscode-electron";
import { parseDocument, type TtDocument } from "@miragon/team-topologies-schema-model";
import { expect, it } from "vitest";
import { documentProblems } from "../src/problems.js";
import { WEBVIEW_THEMES } from "../src/themes.js";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const extensionFolder = resolve(here, "..");
const repositoryRoot = resolve(here, "../../..");
const screenshotDir = resolve(repositoryRoot, "test-results/vscode-smoke");

/** The check the Problems view runs: valid JSON, a valid diagram, no dropped connector. */
function parseTeamTopology(text: string): TtDocument {
  const problems = documentProblems(text);
  if (problems.length > 0) {
    throw new Error(
      problems.map((problem) => `${problem.severity}: ${problem.message}`).join("; "),
    );
  }
  const result = parseDocument(JSON.parse(text));
  if (!result.ok) throw new Error(result.error);
  return result.document;
}

/**
 * Packs the VSIX as the release does (`vsce package` runs `vscode:prepublish`, the production
 * build) and unpacks its `extension/` folder, so VS Code loads exactly the files that ship.
 */
async function packExtension(into: string): Promise<string> {
  const vsix = join(into, "team-topologies-modeler.vsix");
  await run("npx", ["--no-install", "vsce", "package", "--no-dependencies", "--out", vsix], {
    cwd: extensionFolder,
    maxBuffer: 16 * 1024 * 1024,
  });
  await run("unzip", ["-q", vsix, "extension/*", "-d", into]);
  return join(into, "extension");
}

/**
 * The files the webview loads by URL: no activation error names them when the package lacks one.
 * Its bundle, its stylesheet and every file the stylesheet links (the Geist fonts).
 */
async function missingWebviewFiles(extensionPath: string): Promise<string[]> {
  const dist = join(extensionPath, "dist");
  const stylesheet = await readFile(join(dist, "webview.css"), "utf8").catch(() => "");
  const linkedFiles = [...stylesheet.matchAll(/url\("?(\.\/[^")]+)"?\)/g)].map(([, file]) => file);
  return ["webview.js", "webview.css", ...linkedFiles]
    .map((file) => join("dist", file))
    .filter((file) => !existsSync(join(extensionPath, file)));
}

/**
 * The default check (a shape on the canvas) passes an editor without its stylesheet: the shapes
 * and the chrome are in the DOM all the same, collapsed and unstyled. The shell's stylesheet lays
 * the palette over the canvas; without it the palette stays in the page's flow.
 */
async function showsStyledDiagram({ webview, timeoutMs }: VsCodeSmokeContext): Promise<void> {
  const html = webview.locator("html");
  const deadline = performance.now() + timeoutMs;
  for (;;) {
    const facts = await html.evaluate(() => {
      const palette = document.querySelector('[data-chrome="palette"]');
      return {
        shapes: document.querySelectorAll(".djs-shape").length,
        palettePosition: palette ? getComputedStyle(palette).position : undefined,
      };
    });
    if (facts.shapes > 0 && facts.palettePosition !== "static") return;
    if (performance.now() > deadline) {
      throw new Error(
        facts.shapes === 0
          ? "the canvas shows no element of the fixture"
          : "the webview's stylesheet did not apply (the palette is position: static)",
      );
    }
    await sleep(100);
  }
}

// The first run downloads VS Code (about 320 to 360 MB) into the OS's cache directory.
it(
  "opens, edits, saves, undoes and themes a diagram in a real VS Code",
  { timeout: 600_000 },
  async () => {
    const workDirectory = await mkdtemp(join(tmpdir(), "team-topologies-vscode-smoke-"));
    try {
      const packStarted = performance.now();
      const extensionPath = await packExtension(workDirectory);
      console.log(`pack: ${Math.round(performance.now() - packStarted)} ms`);
      expect(await missingWebviewFiles(extensionPath)).toEqual([]);

      const fixtureText = await readFile(join(here, "checkout.tt"), "utf8");
      const fixture = parseTeamTopology(fixtureText);

      const result = await runVsCodeSmoke({
        extensionPath,
        fixture: { fileName: "checkout.tt", text: fixtureText },
        parse: parseTeamTopology,
        ready: showsStyledDiagram,
        themes: WEBVIEW_THEMES,
        name: "team-topologies",
        screenshotDir,
        log: console.log,
      });
      console.log(formatVsCodeSmoke(result));

      expect(result.failures).toEqual([]);
      const saved = result.saved?.parsed as TtDocument | undefined;
      expect(saved?.nodes).toHaveLength(fixture.nodes.length + 1);
      expect(result.undone).toBe(true);
      expect(result.themes.map(({ theme, ok }) => [theme.id, ok])).toEqual(
        VSCODE_COLOR_THEMES.map(({ id }) => [id, true]),
      );
    } finally {
      await rm(workDirectory, { recursive: true, force: true });
    }
  },
);
