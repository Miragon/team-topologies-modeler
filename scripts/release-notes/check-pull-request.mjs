// Fails a pull request whose breaking changes would not all reach CHANGELOG.md and the GitHub
// release once it is squash-merged. CI passes the pull_request event; locally:
//   npm run check:release-notes -- <pull request number>
import { readFileSync } from "node:fs";
import { breakingChangeReport } from "./breaking-changes.mjs";

const repository = process.env.GITHUB_REPOSITORY ?? "Miragon/team-topologies-modeler";
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
const token = process.env.GITHUB_TOKEN;
const event = process.env.GITHUB_EVENT_PATH
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
  : {};

async function gitHub(path) {
  const response = await fetch(`${apiUrl}/repos/${repository}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function commitMessages(number) {
  const messages = [];
  for (let page = 1; ; page += 1) {
    const commits = await gitHub(`/pulls/${number}/commits?per_page=100&page=${page}`);
    messages.push(...commits.map((commit) => commit.commit.message));
    if (commits.length < 100) return messages;
  }
}

const number = Number(process.argv[2] ?? event.pull_request?.number);
if (!Number.isInteger(number) || number <= 0) {
  console.error("Usage: npm run check:release-notes -- <pull request number>");
  process.exit(2);
}
// The event carries the description as the edit that triggered this run left it.
const pullRequest =
  event.pull_request?.number === number ? event.pull_request : await gitHub(`/pulls/${number}`);

const report = breakingChangeReport({
  number,
  title: pullRequest.title,
  body: pullRequest.body ?? "",
  commits: await commitMessages(number),
});

const source = report.hasOverride ? "its BEGIN_COMMIT_OVERRIDE block" : "its commits";
if (report.complete) {
  console.log(
    report.expected.length === 0
      ? `#${number}: no breaking change in ${source}.`
      : `#${number}: release-please writes all ${report.expected.length} breaking change(s) of ${source} into CHANGELOG.md and the release notes.`,
  );
  process.exit(0);
}

const lines = [
  `#${number} declares ${report.expected.length} breaking change(s) in ${source}; release-please would write ${report.released.length} into CHANGELOG.md and the release notes.`,
];
if (report.hasOverride && report.changelogEntries === 0) {
  lines.push(
    "release-please finds no conventional commit after BEGIN_COMMIT_OVERRIDE, so the pull request would vanish from CHANGELOG.md. It reads everything after the first BEGIN_COMMIT_OVERRIDE in the description: name the markers nowhere else.",
  );
}
if (report.emptyNotes > 0) {
  lines.push(
    `${report.emptyNotes} of them would be an empty bullet: release-please keeps a BREAKING CHANGE footer's text only when it starts on the footer's own line.`,
  );
}
const listed = (text) => `- ${text || "(a BREAKING CHANGE footer with no text on its own line)"}`;
if (report.lost.length > 0) {
  lines.push("Lost:", ...report.lost.map(listed));
}
if (report.expected.length < report.declaredByCommits.length) {
  lines.push(
    `Its commits declare ${report.declaredByCommits.length}, and the block needs a BREAKING CHANGE footer for each:`,
    ...report.declaredByCommits.map(listed),
  );
}
lines.push(
  "",
  `${report.hasOverride ? "Fix the" : "Add a"} BEGIN_COMMIT_OVERRIDE … END_COMMIT_OVERRIDE block in the pull request's description:`,
  "one message per breaking change, each with its own one-paragraph BREAKING CHANGE footer whose text",
  'starts on the footer\'s line, and no `!` in its header (CONTRIBUTING.md, "Breaking changes").',
  "The check reruns when you save the description.",
);
console.error(lines.join("\n"));
process.exit(1);
