import "server-only";

import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";
import { fetchRepoMetrics } from "@/lib/github";

/**
 * Fetches fresh data from GitHub and persists a partial assessment.
 *
 * @remarks
 * The maintenance score is NOT calculated here - it's deferred to the
 * ScoreAndChartAsync component which has access to commit activity data.
 * The `maintenanceScore` field will be null until that component runs.
 *
 * This function does NOT invalidate caches - use the `analyze()` server action
 * when you need cache invalidation (e.g., user-triggered refresh).
 *
 * @param owner - Repository owner (username or organization)
 * @param project - Repository name
 * @returns The persisted `Assessment` record (with maintenanceScore: null)
 * @throws If the repository doesn't exist or GitHub API fails
 */
export async function fetchFreshAssessment(
  owner: string,
  project: string,
): Promise<Assessment> {
  const fullName = `${owner}/${project}`;

  const metrics = await fetchRepoMetrics(owner, project);

  const analyzedAt = new Date();
  const sharedFields = {
    description: metrics.description,
    stars: metrics.stars,
    forks: metrics.forks,
    avatarUrl: metrics.avatarUrl,
    htmlUrl: metrics.htmlUrl,
    license: metrics.license,
    language: metrics.language,
    repositoryCreatedAt: metrics.repositoryCreatedAt,
    isArchived: metrics.isArchived,
    lastCommitAt: metrics.lastCommitAt,
    lastReleaseAt: metrics.lastReleaseAt,
    lastClosedIssueAt: metrics.lastClosedIssueAt,
    openIssuesPercent: metrics.openIssuesPercent,
    openIssuesCount: metrics.openIssuesCount,
    closedIssuesCount: metrics.closedIssuesCount,
    medianIssueResolutionDays: metrics.medianIssueResolutionDays,
    openPrsCount: metrics.openPrsCount,
    issuesCreatedLastYear: metrics.issuesCreatedLastYear,
    commitActivity: metrics.commitActivity,
    releases: metrics.releases,
    // Score calculated later in ScoreAndChartAsync when commit data is available
    maintenanceScore: null,
    analyzedAt,
  };

  const [result] = await db
    .insert(assessments)
    .values({
      owner,
      repo: project,
      fullName,
      ...sharedFields,
    })
    .onConflictDoUpdate({
      target: assessments.fullName,
      set: sharedFields,
    })
    .returning();

  return result;
}
