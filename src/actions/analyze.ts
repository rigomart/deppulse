"use server";

import { updateTag } from "next/cache";
import type { Assessment } from "@/db/schema";
import { fetchFreshAssessment } from "@/lib/assessment";
import { getProjectTag } from "@/lib/data";

/**
 * Server action: Analyze a GitHub repository, compute its risk profile, persist the assessment, and invalidate related caches.
 *
 * Use this for explicit user-triggered re-analysis (e.g., a "Refresh" button).
 * For render-time fetching, use `fetchFreshAssessment()` directly.
 *
 * @param owner - Repository owner (username or organization)
 * @param project - Repository name
 * @returns The persisted `Assessment` record including repository metrics, `riskCategory`, `riskScore`, and `analyzedAt`
 */
export async function analyze(
  owner: string,
  project: string,
): Promise<Assessment> {
  const result = await fetchFreshAssessment(owner, project);

  // Invalidate cached data for this specific repo (recent list refreshes via TTL)
  updateTag(getProjectTag(owner, project));

  return result;
}
