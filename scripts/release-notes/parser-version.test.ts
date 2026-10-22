// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Dependabot moves the action's pin but not this table, so an action bump fails here until someone
// looks up the release-please it bundles (its package-lock.json) and moves the devDependency along.
const RELEASE_PLEASE_BUNDLED_BY_ACTION: Record<string, string> = { "v5.0.0": "17.6.0" };

const repositoryFile = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

it("checks with the release-please the Release workflow's action bundles", () => {
  const actionVersion = repositoryFile(".github/workflows/release-please.yml").match(
    /googleapis\/release-please-action@[0-9a-f]{40} # (v\S+)/,
  )?.[1];
  expect(actionVersion, "release-please.yml pins release-please-action").toBeDefined();
  const { devDependencies } = JSON.parse(repositoryFile("package.json"));
  expect(
    RELEASE_PLEASE_BUNDLED_BY_ACTION[actionVersion ?? ""],
    `the release-please that release-please-action ${actionVersion} bundles`,
  ).toBe(devDependencies["release-please"]);
});
