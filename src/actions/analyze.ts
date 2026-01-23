"use server";

import { updateTag } from "next/cache";
import {
  CACHE_REVALIDATE,
  getAssessmentFromDb,
  getProjectTag,
} from "@/db/queries";
import type { Assessment } from "@/db/schema";
import { fetchFreshAssessment } from "@/lib/assessment";

/**
 * Server action: Analyze a GitHub repository with freshness checking.
 *
 * Returns cached data if fresh (<7 days), otherwise fetches from GitHub API.
 * Called from homepage search form - blocks until complete, then navigates.
 *
 * @param owner - Repository owner (username or organization)
 * @param project - Repository name
 * @returns The `Assessment` record (cached or freshly fetched)
 */
export async function analyze(
  owner: string,
  project: string,
): Promise<Assessment> {
  // Check for fresh cached data first
  const cached = await getAssessmentFromDb(owner, project);

  if (cached) {
    const ageSeconds =
      (Date.now() - new Date(cached.analyzedAt).getTime()) / 1000;
    if (ageSeconds < CACHE_REVALIDATE) {
      return cached; // Fresh - skip GitHub API
    }
  }

  // Stale or missing - fetch fresh from GitHub
  const result = await fetchFreshAssessment(owner, project);

  // Invalidate cached data for this specific repo
  updateTag(getProjectTag(owner, project));

  return result;
}
