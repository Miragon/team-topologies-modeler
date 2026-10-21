/// <reference types="node" />
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  formatVsCodeSmoke,
  runVsCodeSmoke,
  VSCODE_COLOR_THEMES,
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

      const fixtureText = await readFile(join(here, "checkout.tt"), "utf8");
      const fixture = parseTeamTopology(fixtureText);

      const result = await runVsCodeSmoke({
        extensionPath,
        fixture: { fileName: "checkout.tt", text: fixtureText },
        parse: parseTeamTopology,
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
