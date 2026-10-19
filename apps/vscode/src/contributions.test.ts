/// <reference types="node" />
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `fileURLToPath(import.meta.url)` instead of `new URL(file, import.meta.url)`, which Vite rewrites
// into an asset URL.
const here = dirname(fileURLToPath(import.meta.url));

interface Manifest {
  contributes: {
    commands: Array<{ command: string; title: string; category: string }>;
    menus: Record<string, Array<{ command: string; when?: string; group?: string }>>;
    walkthroughs: Array<{ steps: Array<{ id: string }> }>;
    keybindings?: unknown;
  };
}

const manifest = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as Manifest;
const { commands, menus, walkthroughs } = manifest.contributes;

describe("the extension's native contributions (guide §13.5)", () => {
  it("offers the menu's view and export actions as commands in Title Case", () => {
    const titles = Object.fromEntries(commands.map(({ command, title }) => [command, title]));
    expect(titles).toMatchObject({
      "teamTopologies.fitView": "Fit to View",
      "teamTopologies.exportPng": "Export as PNG",
      "teamTopologies.exportSvg": "Export as SVG",
      "teamTopologies.openSource": "Open Source to the Side",
      "teamTopologies.openDiagram": "Open Diagram to the Side",
    });
    expect(commands.every(({ category }) => category === "Team Topologies")).toBe(true);
  });

  it("puts fit and export into the editor title's overflow, source and diagram beside", () => {
    const title = menus["editor/title"] ?? [];
    const group = (command: string) => title.find((entry) => entry.command === command)?.group;
    expect(group("teamTopologies.openSource")).toBe("navigation");
    expect(group("teamTopologies.openDiagram")).toBe("navigation");
    expect(
      ["fitView", "exportPng", "exportSvg"].map((name) => group(`teamTopologies.${name}`)),
    ).toEqual(["teamTopologies@1", "teamTopologies@2", "teamTopologies@3"]);
  });

  it("binds no keys of its own and walks through new, source and the basics", () => {
    expect(manifest.contributes.keybindings).toBeUndefined();
    expect(walkthroughs[0]?.steps.map(({ id }) => id)).toEqual(["create", "source", "learn"]);
  });
});
