"use server";

import type { AnalysisRun } from "@/lib/domain/assessment";
import { startAnalysis } from "@/lib/services/assessment-service";

/**
 * Server action: Analyze a GitHub repository with freshness checking.
 *
 * Returns cached data if fresh (<7 days), otherwise fetches from GitHub API.
 * Called from homepage search form - blocks until complete, then navigates.
 *
 * @param owner - Repository owner (username or organization)
 * @param project - Repository name
 * @returns The latest analysis run (cached or freshly fetched)
 */
export async function analyze(
  owner: string,
  project: string,
): Promise<AnalysisRun> {
  return startAnalysis(owner, project, { invalidate: "immediate" });
}
