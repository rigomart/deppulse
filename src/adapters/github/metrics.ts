import "server-only";

import { graphqlWithAuth } from "./client";
import { fetchRepoMetrics as fetchRepoMetricsCore } from "./metrics.core";
import type { RepoMetrics } from "./types";

export type { RepoMetrics };

export async function fetchRepoMetrics(
  owner: string,
  repo: string,
): Promise<RepoMetrics> {
  return fetchRepoMetricsCore(owner, repo, graphqlWithAuth);
}
