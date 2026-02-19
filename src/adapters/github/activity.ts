import "server-only";

import { fetchCommitActivity as fetchCommitActivityCore } from "./activity.core";
import type { CommitActivityResult } from "./types";

export async function fetchCommitActivity(
  owner: string,
  repo: string,
): Promise<CommitActivityResult> {
  if (!process.env.GITHUB_PAT) {
    throw new Error("GITHUB_PAT environment variable is required");
  }
  return fetchCommitActivityCore(owner, repo, process.env.GITHUB_PAT);
}
