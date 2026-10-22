export interface PullRequest {
  number: number;
  title: string;
  body: string;
  commits: string[];
}

export interface BreakingChangeReport {
  hasOverride: boolean;
  changelogEntries: number;
  declaredByCommits: string[];
  expected: string[];
  released: string[];
  emptyNotes: number;
  lost: string[];
  complete: boolean;
}

export declare function squashCommitMessage(
  pullRequest: Pick<PullRequest, "number" | "title" | "commits">,
): string;

export declare function breakingChangeReport(pullRequest: PullRequest): BreakingChangeReport;
