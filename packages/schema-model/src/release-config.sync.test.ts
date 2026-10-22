/// <reference types="node" />
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Drift guard for the lockstep release: release-please's `node` strategy bumps only the root
 * `package.json` and the root entries of `package-lock.json`. Every other place that carries the
 * shared version has to be listed in `extra-files`, or the release PR leaves it behind and the next
 * `npm install` drags the correction into an unrelated pull request.
 */

interface PackageManifest {
  name: string;
  version: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

type ExtraFileEntry = string | { type: string; path: string; jsonpath?: string; glob?: boolean };

interface JsonLocation {
  path: string;
  jsonpath: string;
}

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(repositoryRoot, relativePath), "utf8")) as T;
}

const releasedVersion = readJson<Record<string, string>>(".release-please-manifest.json")["."];
const extraFiles = readJson<{ packages: Record<string, { "extra-files": ExtraFileEntry[] }> }>(
  "release-please-config.json",
).packages["."]["extra-files"];
const jsonExtraFiles = extraFiles.filter(
  (entry): entry is JsonLocation & { type: "json" } =>
    typeof entry === "object" && entry.type === "json" && !entry.glob,
);
const workspaces = (readJson<PackageManifest>("package.json").workspaces ?? []).map(
  (directory) => ({ directory, manifest: readJson<PackageManifest>(`${directory}/package.json`) }),
);
const internalPackageNames = new Set(workspaces.map(({ manifest }) => manifest.name));
const dependencySections = ["dependencies", "devDependencies"] as const;

function jsonLocation(path: string, jsonpath: string): JsonLocation {
  return { path, jsonpath };
}

function sharedVersionLocations(): JsonLocation[] {
  return workspaces.flatMap(({ directory, manifest }) => [
    jsonLocation(`${directory}/package.json`, "$.version"),
    jsonLocation("package-lock.json", `$.packages['${directory}'].version`),
    ...dependencySections.flatMap((section) =>
      Object.keys(manifest[section] ?? {})
        .filter((dependencyName) => internalPackageNames.has(dependencyName))
        .flatMap((dependencyName) => [
          jsonLocation(`${directory}/package.json`, `$.${section}['${dependencyName}']`),
          jsonLocation(
            "package-lock.json",
            `$.packages['${directory}'].${section}['${dependencyName}']`,
          ),
        ]),
    ),
  ]);
}

const jsonpathSegment = /\.([\w-]+)|\['([^']+)'\]|\[(\d+)\]/y;

function readJsonPath(document: unknown, jsonpath: string): unknown {
  if (!jsonpath.startsWith("$")) throw new Error(`Unsupported jsonpath: ${jsonpath}`);
  let value = document;
  jsonpathSegment.lastIndex = 1;
  while (jsonpathSegment.lastIndex < jsonpath.length) {
    const match = jsonpathSegment.exec(jsonpath);
    if (!match) throw new Error(`Unsupported jsonpath: ${jsonpath}`);
    const key = match[1] ?? match[2] ?? Number(match[3]);
    value = (value as Record<string | number, unknown> | undefined)?.[key];
  }
  return value;
}

const describeLocation = ({ path, jsonpath }: JsonLocation): string => `${path} ${jsonpath}`;

describe("release-please extra-files", () => {
  it("bumps every workspace version and internal dependency in package.json and package-lock.json", () => {
    const listed = new Set(jsonExtraFiles.map(describeLocation));
    const missing = sharedVersionLocations()
      .map(describeLocation)
      .filter((location) => !listed.has(location));

    expect(missing).toEqual([]);
  });

  // release-please skips a jsonpath that matches nothing without any log line, so a mistyped or
  // orphaned entry would silently drop its bump.
  it("points every json entry at a value that holds the released version", () => {
    const stale = jsonExtraFiles
      .map((extraFile) => ({
        location: describeLocation(extraFile),
        value: readJsonPath(readJson(extraFile.path), extraFile.jsonpath),
      }))
      .filter(({ value }) => value !== releasedVersion);

    expect(stale).toEqual([]);
  });
});
