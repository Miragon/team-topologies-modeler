// release-please writes CHANGELOG.md and the GitHub release from one breaking note per
// conventional-commit message. A squash commit is one message, so of all the BREAKING CHANGE
// footers its commits carry only one reaches the release (as a rule the first), and a
// `type(scope)!:` line inside it counts for nothing. This module asks release-please's own parser,
// at the version the Release workflow's action bundles, what it keeps of a pull request once it is
// squash-merged.
import { parseConventionalCommits } from "release-please/build/src/commit.js";

const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:[ \t]*(.*)$/;
const BREAKING_HEADER = /^[\w-]+(?:\([^()]*\))?!:[ \t]*(.+)$/;
const CO_AUTHOR_TRAILER = /^co-authored-by:[ \t]*(.+)$/i;

function linesOf(text) {
  return text.split(/\r?\n/);
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Mirrors the repository's squash settings (title: the pull request's, or a single commit's own;
// message: the commit messages), so the check parses the very text the merge will write.
export function squashCommitMessage({ number, title, commits }) {
  if (commits.length === 1) {
    const [subject, ...body] = linesOf(commits[0]);
    return [`${subject} (#${number})`, ...body].join("\n");
  }
  const coAuthors = new Map();
  for (const line of commits.flatMap(linesOf)) {
    const coAuthor = line.match(CO_AUTHOR_TRAILER)?.[1].trim();
    if (coAuthor && !coAuthors.has(coAuthor.toLowerCase())) {
      coAuthors.set(coAuthor.toLowerCase(), coAuthor);
    }
  }
  const trailer =
    coAuthors.size > 0
      ? `\n\n---------\n\n${[...coAuthors.values()].map((coAuthor) => `Co-authored-by: ${coAuthor}`).join("\n")}`
      : "";
  return `${title} (#${number})\n\n${commits.map((message) => `* ${message.trim()}`).join("\n\n")}${trailer}`;
}

// Cut the way release-please's preprocessCommitMessage cuts it, so an override the release would
// ignore is ignored here too.
function commitOverride(body) {
  return (body.split("BEGIN_COMMIT_OVERRIDE")[1] ?? "").split("END_COMMIT_OVERRIDE")[0].trim();
}

function breakingFooters(text) {
  const paragraphs = [];
  let paragraph;
  for (const line of linesOf(text)) {
    const footer = line.match(BREAKING_FOOTER);
    if (footer) {
      paragraph = [footer[1]];
      paragraphs.push(paragraph);
    } else if (line.trim() === "") {
      paragraph = undefined;
    } else {
      paragraph?.push(line);
    }
  }
  return paragraphs.map((lines) => ({
    summary: normalize(lines.find((line) => line.trim() !== "") ?? ""),
    text: normalize(lines.join(" ")),
  }));
}

function breakingChangesOfCommit(message) {
  const footers = breakingFooters(message);
  if (footers.length > 0) return footers;
  const subject = linesOf(message)[0].match(BREAKING_HEADER)?.[1];
  return subject ? [{ summary: normalize(subject), text: normalize(subject) }] : [];
}

function releasedCommits(pullRequest) {
  const squashCommit = {
    sha: "squash",
    message: squashCommitMessage(pullRequest),
    files: [],
    pullRequest: {
      number: pullRequest.number,
      title: pullRequest.title,
      body: pullRequest.body,
      headBranchName: "",
      baseBranchName: "main",
      labels: [],
      files: [],
    },
  };
  const silent = () => undefined;
  return parseConventionalCommits([squashCommit], {
    error: silent,
    warn: silent,
    info: silent,
    debug: silent,
    trace: silent,
  });
}

// A note starts with its footer's first line; the rest of the paragraph may be cut or joined
// differently, depending on where release-please found the footer. release-please keeps a footer's
// text only when it starts on the footer's own line: otherwise the note is an empty bullet, or
// missing when nothing follows the footer, so an empty note or summary never counts as written.
function unreleased(expected, released) {
  const remaining = released.map(normalize).filter((note) => note !== "");
  const missing = new Set(expected);
  // Longest first, so a summary that starts another one cannot take that one's note.
  for (const change of [...expected].sort((a, b) => b.summary.length - a.summary.length)) {
    if (change.summary === "") continue;
    const index = remaining.findIndex((note) => note.startsWith(change.summary));
    if (index !== -1) {
      remaining.splice(index, 1);
      missing.delete(change);
    }
  }
  return expected.filter((change) => missing.has(change));
}

export function breakingChangeReport(pullRequest) {
  const override = commitOverride(pullRequest.body);
  const declaredByCommits = pullRequest.commits.flatMap(breakingChangesOfCommit);
  const expected = override ? breakingFooters(override) : declaredByCommits;
  const commits = releasedCommits(pullRequest);
  const released = commits.flatMap((commit) =>
    commit.notes.filter((note) => note.title === "BREAKING CHANGE").map((note) => note.text),
  );
  const lost = unreleased(expected, released);
  const emptyNotes = released.filter((note) => normalize(note) === "").length;
  const hasOverride = override !== "";
  return {
    hasOverride,
    changelogEntries: commits.length,
    declaredByCommits: declaredByCommits.map((change) => change.text),
    expected: expected.map((change) => change.text),
    released,
    emptyNotes,
    lost: lost.map((change) => change.text),
    complete:
      (!hasOverride || commits.length > 0) &&
      lost.length === 0 &&
      emptyNotes === 0 &&
      expected.length >= declaredByCommits.length,
  };
}
