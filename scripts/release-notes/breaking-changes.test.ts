// @vitest-environment node
/// <reference types="node" />
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { breakingChangeReport, squashCommitMessage } from "./breaking-changes.mjs";
import { mergedPullRequest, overrideBody } from "./fixtures/merged-pull-requests";

const DUPLICATE_IDS =
  'parseDocument keeps unknown fields instead of stripping them and rejects duplicate and reserved ids; serializeDocument(doc) ends with "\\n".';
const CANVAS_KEYS =
  'the canvas no longer binds +, -, Shift+0 and Shift+1; importDocument fires no commandStack.changed, rejects colliding ids and takes { fit }; palette entries are no tab stops and react to a click with detail 0 instead of keydown; the canvas svg has no role="group".';
const BUILT_IN_IDS =
  "parseDocument and documentIdProblems refuse ids that name a built-in property of JavaScript objects (constructor, toString, __proto__, hasOwnProperty, valueOf, ...).";
const INTERACTION_GEOMETRY =
  "parseDocument refuses a version 2 or 3 document with an interaction that has no position or size instead of dropping that interaction.";

describe("the squash commit GitHub writes", () => {
  it.each([122, 129] as const)("is byte-identical to the one #%i left on main", (number) => {
    const pullRequest = mergedPullRequest(number);
    const message = squashCommitMessage(pullRequest);
    expect(createHash("sha256").update(message).digest("hex")).toBe(
      pullRequest.squashCommit.messageSha256,
    );
  });

  it("keeps a single commit's own title", () => {
    expect(squashCommitMessage({ number: 7, title: "ignored", commits: ["fix: a\n\nbody"] })).toBe(
      "fix: a (#7)\n\nbody",
    );
  });
});

describe("breakingChangeReport on the pull requests that lost a breaking change", () => {
  it.each([
    [122, [DUPLICATE_IDS, CANVAS_KEYS], [CANVAS_KEYS]],
    [129, [BUILT_IN_IDS, INTERACTION_GEOMETRY], [INTERACTION_GEOMETRY]],
  ] as const)("names what #%i lost without an override", (number, declared, lost) => {
    const report = breakingChangeReport({ ...mergedPullRequest(number), body: "" });
    expect(report.declaredByCommits).toEqual(declared);
    expect(report.released).toHaveLength(1);
    expect(report.lost).toEqual(lost);
    expect(report.complete).toBe(false);
  });

  it.each([122, 129] as const)("passes #%i with its BEGIN_COMMIT_OVERRIDE block", (number) => {
    const report = breakingChangeReport({
      ...mergedPullRequest(number),
      body: `Summary of the change.\n\n${overrideBody(number)}`,
    });
    expect(report.hasOverride).toBe(true);
    expect(report.released).toHaveLength(2);
    expect(report.lost).toEqual([]);
    expect(report.complete).toBe(true);
  });
});

function report(commits: string[], body = "", title = "feat: several changes") {
  return breakingChangeReport({ number: 1, title, body, commits });
}

const override = (...messages: string[]) =>
  `BEGIN_COMMIT_OVERRIDE\n${messages.join("\n\n")}\nEND_COMMIT_OVERRIDE`;

describe("breakingChangeReport", () => {
  it("passes a pull request without breaking changes", () => {
    expect(report(["feat: a", "fix: b"])).toMatchObject({ expected: [], complete: true });
  });

  it("passes one footer of several lines among several commits, trailers after it", () => {
    const result = report([
      "feat(renderer): a\n\nBREAKING CHANGE: the first line\nand the second.\nRefs #12",
      "fix: b",
    ]);
    expect(result.released).toEqual(["the first line and the second. Refs #12"]);
    expect(result.complete).toBe(true);
  });

  it("passes the footer of a single commit", () => {
    expect(report(["feat!: a\n\nBREAKING CHANGE: b is gone"]).complete).toBe(true);
  });

  it("loses the second of two footers in one commit", () => {
    const result = report(["feat: a\n\nBREAKING CHANGE: a is gone\n\nBREAKING CHANGE: b is gone"]);
    expect(result.released).toEqual(["b is gone"]);
    expect(result.lost).toEqual(["a is gone"]);
  });

  it("loses a commit marked breaking only by the ! in its header", () => {
    const result = report(["feat(renderer)!: drop the zoom keys", "fix: b"]);
    expect(result.declaredByCommits).toEqual(["drop the zoom keys"]);
    expect(result.released).toEqual([]);
    expect(result.complete).toBe(false);
  });

  it("passes an override with one message per breaking change", () => {
    const result = report(
      ["feat: a\n\nBREAKING CHANGE: a is gone", "feat: b\n\nBREAKING-CHANGE: b is gone"],
      override(
        "feat: several changes (#1)\n\nBREAKING CHANGE: a is gone",
        "feat(renderer): b\n\nBREAKING-CHANGE: b is gone",
      ),
    );
    expect(result.released).toEqual(["a is gone", "b is gone"]);
    expect(result.complete).toBe(true);
  });

  it("loses a footer in an override whose next header carries a !", () => {
    const result = report(
      [],
      override(
        "feat: several changes (#1)\n\nBREAKING CHANGE: a is gone",
        "feat(renderer)!: b\n\nBREAKING CHANGE: b is gone",
      ),
    );
    expect(result.lost).toEqual(["a is gone"]);
  });

  it("fails a footer whose text starts on the line after it, which release-please writes empty", () => {
    const result = report([
      "feat(renderer): drop the zoom keys\n\nBREAKING CHANGE:\nthe canvas no longer binds + and -.",
      "fix: b",
    ]);
    expect(result).toMatchObject({
      released: [""],
      emptyNotes: 1,
      lost: ["the canvas no longer binds + and -."],
      complete: false,
    });
  });

  it("fails a footer with no text at all, which release-please does not even count as breaking", () => {
    const result = report(["fix: b", "feat(renderer): drop the zoom keys\n\nBREAKING CHANGE:"]);
    expect(result).toMatchObject({ released: [], lost: [""], complete: false });
  });

  it("fails an override whose footers' text starts on the line after them", () => {
    const result = report(
      ["feat: a\n\nBREAKING CHANGE: a is gone", "feat: b\n\nBREAKING CHANGE: b is gone"],
      override(
        "feat: several changes (#1)\n\nBREAKING CHANGE:\na is gone",
        "feat(renderer): b\n\nBREAKING CHANGE:\nb is gone",
      ),
    );
    expect(result).toMatchObject({
      released: ["", ""],
      emptyNotes: 2,
      lost: ["a is gone", "b is gone"],
      complete: false,
    });
  });

  it("fails a description that names the marker without a block after it", () => {
    const result = report(
      ["feat: a", "fix: b"],
      "Explains when to add a BEGIN_COMMIT_OVERRIDE block to a description.",
    );
    expect(result).toMatchObject({ hasOverride: true, changelogEntries: 0, complete: false });
  });

  it("fails an override that lists fewer breaking changes than the commits declare", () => {
    const result = report(
      ["feat: a\n\nBREAKING CHANGE: a is gone", "feat: b\n\nBREAKING CHANGE: b is gone"],
      override("feat: several changes (#1)\n\nBREAKING CHANGE: a and b are gone"),
    );
    expect(result.lost).toEqual([]);
    expect(result.complete).toBe(false);
  });
});

describe("CONTRIBUTING.md", () => {
  it("shows the BEGIN_COMMIT_OVERRIDE block #129 needed, and it keeps both breaking changes", () => {
    const contributing = readFileSync(new URL("../../CONTRIBUTING.md", import.meta.url), "utf8");
    const example = contributing.match(
      /```text\n(BEGIN_COMMIT_OVERRIDE\n[\s\S]*?\nEND_COMMIT_OVERRIDE)\n```/,
    )?.[1];
    expect(example).toBe(overrideBody(129).trim());
    const report = breakingChangeReport({ ...mergedPullRequest(129), body: example ?? "" });
    expect(report.released).toEqual([BUILT_IN_IDS, INTERACTION_GEOMETRY]);
    expect(report.complete).toBe(true);
  });
});
