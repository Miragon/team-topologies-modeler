// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { Errors, Manifest, setLogger } from "release-please";
import type { Commit, GitHub } from "release-please";
import { beforeAll, describe, expect, it } from "vitest";
import { breakingChangeReport, squashCommitMessage } from "./breaking-changes.mjs";
import {
  mergedPullRequest,
  overrideBody,
  type MergedPullRequestNumber,
} from "./fixtures/merged-pull-requests";

// release-please run offline on the repository's own release config: only its reads of the
// history and the files go to fixtures instead of the GitHub API, nothing is written anywhere.

const repositoryFile = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

interface FixtureHistory {
  previousVersion: string;
  commitsSincePreviousRelease: Commit[];
}

function fixtureGitHub({ previousVersion, commitsSincePreviousRelease }: FixtureHistory): GitHub {
  const releaseCommit = `release-${previousVersion}`;
  const files: Record<string, string> = {
    "release-please-config.json": repositoryFile("release-please-config.json"),
    ".release-please-manifest.json": JSON.stringify({ ".": previousVersion }),
  };
  const fileContents = (path: string) => {
    const parsedContent = files[path];
    if (parsedContent === undefined) throw new Errors.FileNotFoundError(path);
    return {
      parsedContent,
      content: Buffer.from(parsedContent).toString("base64"),
      sha: "",
      mode: "100644",
    };
  };
  const gitHub = {
    repository: { owner: "Miragon", repo: "team-topologies-modeler", defaultBranch: "main" },
    getFileContentsOnBranch: async (path: string) => fileContents(path),
    getFileJson: async (path: string) => JSON.parse(fileContents(path).parsedContent),
    async *releaseIterator() {
      yield { name: `v${previousVersion}`, tagName: `v${previousVersion}`, sha: releaseCommit };
    },
    async *mergeCommitIterator() {
      yield* commitsSincePreviousRelease;
      yield { sha: releaseCommit, message: `chore(main): release ${previousVersion}`, files: [] };
    },
  };
  return gitHub as unknown as GitHub;
}

async function releaseNotes(history: FixtureHistory): Promise<string> {
  const manifest = await Manifest.fromManifest(
    fixtureGitHub(history),
    "main",
    "release-please-config.json",
    ".release-please-manifest.json",
  );
  const [releasePullRequest] = await manifest.buildPullRequests();
  return releasePullRequest.body.toString();
}

function squashMergedHistory(
  number: MergedPullRequestNumber,
  previousVersion: string,
  body: string,
): FixtureHistory {
  const pullRequest = mergedPullRequest(number);
  return {
    previousVersion,
    commitsSincePreviousRelease: [
      {
        sha: pullRequest.squashCommit.sha,
        message: squashCommitMessage(pullRequest),
        files: [],
        pullRequest: {
          number,
          title: pullRequest.title,
          body,
          headBranchName: "feature",
          baseBranchName: "main",
          labels: [],
          files: [],
        },
      },
    ],
  };
}

function breakingChangeBullets(markdown: string): string[] {
  const section = markdown.split("### ⚠ BREAKING CHANGES")[1]?.split(/\n#{2,3} /)[0] ?? "";
  return section.split("\n").filter((line) => line.startsWith("* "));
}

function changelogSection(version: string): string {
  const changelog = repositoryFile("CHANGELOG.md");
  const start = changelog.indexOf(`## [${version}]`);
  expect(start, `CHANGELOG.md has a section for ${version}`).toBeGreaterThan(-1);
  const end = changelog.indexOf("\n## [", start + 1);
  return changelog.slice(start, end === -1 ? undefined : end);
}

beforeAll(() => {
  const silent = () => undefined;
  setLogger({ error: silent, warn: silent, info: silent, debug: silent, trace: silent });
});

describe.each([
  { number: 122, previousVersion: "0.10.1", version: "0.11.0" },
  { number: 129, previousVersion: "0.11.2", version: "0.12.0" },
] as const)("release $version with #$number", ({ number, previousVersion, version }) => {
  it("as merged, without an override, keeps only the first of the two footers", async () => {
    const notes = await releaseNotes(squashMergedHistory(number, previousVersion, ""));
    expect(notes).toContain(`## [${version}]`);
    expect(breakingChangeBullets(notes)).toEqual(
      breakingChangeBullets(changelogSection(version)).slice(0, 1),
    );
  });

  it("with the BEGIN_COMMIT_OVERRIDE block, lists both, and CHANGELOG.md lists them too", async () => {
    const notes = await releaseNotes(
      squashMergedHistory(number, previousVersion, `Summary.\n\n${overrideBody(number)}`),
    );
    const bullets = breakingChangeBullets(notes);
    expect(bullets).toHaveLength(2);
    expect(breakingChangeBullets(changelogSection(version))).toEqual(bullets);
  });
});

describe("release 0.12.0 with #129 and an override whose footers' text starts on the next line", () => {
  const body = `Summary.\n\n${overrideBody(129).replaceAll("BREAKING CHANGE: ", "BREAKING CHANGE:\n")}`;

  it("writes empty bullets, and the check fails", async () => {
    const notes = await releaseNotes(squashMergedHistory(129, "0.11.2", body));
    expect(breakingChangeBullets(notes)).toEqual(["* ", "* **schema-model:** "]);
    expect(breakingChangeReport({ ...mergedPullRequest(129), body })).toMatchObject({
      emptyNotes: 2,
      complete: false,
    });
  });
});
