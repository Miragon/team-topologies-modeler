/// <reference types="node" />
import { readFileSync } from "node:fs";

export type MergedPullRequestNumber = 122 | 129;

export interface MergedPullRequest {
  number: MergedPullRequestNumber;
  title: string;
  commits: string[];
  squashCommit: { sha: string; messageSha256: string };
}

export function mergedPullRequest(number: MergedPullRequestNumber): MergedPullRequest {
  return JSON.parse(readFileSync(new URL(`pull-request-${number}.json`, import.meta.url), "utf8"));
}

export function overrideBody(number: MergedPullRequestNumber): string {
  return readFileSync(new URL(`pull-request-${number}-override.txt`, import.meta.url), "utf8");
}
