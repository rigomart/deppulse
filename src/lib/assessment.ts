import "server-only";

import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";
import { fetchRepoMetrics, type RepoMetrics } from "@/lib/github";
import { calculateRisk } from "@/lib/risk";
import type { MetricsPayload } from "@/lib/types";

/**
 * Extracts the metrics payload from RepoMetrics for risk calculation and DB storage.
 */
function extractMetrics(m: RepoMetrics): MetricsPayload {
  return {
    daysSinceLastCommit: m.daysSinceLastCommit,
    commitsLast90Days: m.commitsLast90Days,
    daysSinceLastRelease: m.daysSinceLastRelease,
    openIssuesPercent: m.openIssuesPercent,
    medianIssueResolutionDays: m.medianIssueResolutionDays,
    openPrsCount: m.openPrsCount,
  };
}

/**
 * Fetches fresh data from GitHub, computes risk, and persists the assessment.
 *
 * This function does NOT invalidate caches - use the `analyze()` server action
 * when you need cache invalidation (e.g., user-triggered refresh).
 *
 * @param owner - Repository owner (username or organization)
 * @param project - Repository name
 * @returns The persisted `Assessment` record
 * @throws If the repository doesn't exist or GitHub API fails
 */
export async function fetchFreshAssessment(
  owner: string,
  project: string,
): Promise<Assessment> {
  const fullName = `${owner}/${project}`;

  const metrics = await fetchRepoMetrics(owner, project);
  const metricsPayload = extractMetrics(metrics);
  const risk = calculateRisk(metricsPayload);

  const [result] = await db
    .insert(assessments)
    .values({
      owner,
      repo: project,
      fullName,
      description: metrics.description,
      stars: metrics.stars,
      forks: metrics.forks,
      avatarUrl: metrics.avatarUrl,
      htmlUrl: metrics.htmlUrl,
      license: metrics.license,
      language: metrics.language,
      repositoryCreatedAt: metrics.repositoryCreatedAt,
      ...metricsPayload,
      riskCategory: risk.category,
      riskScore: risk.score,
      analyzedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: assessments.fullName,
      set: {
        description: metrics.description,
        stars: metrics.stars,
        forks: metrics.forks,
        avatarUrl: metrics.avatarUrl,
        htmlUrl: metrics.htmlUrl,
        ...metricsPayload,
        riskCategory: risk.category,
        riskScore: risk.score,
        analyzedAt: new Date(),
      },
    })
    .returning();

  return result;
}
