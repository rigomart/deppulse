import "server-only";

import { fetchCommitActivity as fetchCommitActivityCore } from "./activity.core";
import { octokit } from "./client";
import type { CommitActivityResult } from "./types";

export async function fetchCommitActivity(
  owner: string,
  repo: string,
): Promise<CommitActivityResult> {
  return fetchCommitActivityCore(owner, repo, octokit);
}
