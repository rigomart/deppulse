import "server-only";

import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";
import { fetchRepoMetrics, type RepoMetrics } from "@/lib/github";
import {
  calculateMaintenanceScore,
  type MaintenanceInput,
} from "@/lib/maintenance";

/**
 * Extracts the maintenance input from RepoMetrics for score calculation.
 */
function extractMaintenanceInput(m: RepoMetrics): MaintenanceInput {
  return {
    daysSinceLastCommit: m.daysSinceLastCommit,
    commitsLast90Days: m.commitsLast90Days,
    openIssuesPercent: m.openIssuesPercent,
    medianIssueResolutionDays: m.medianIssueResolutionDays,
    issuesCreatedLast90Days: m.issuesCreatedLast90Days,
    daysSinceLastRelease: m.daysSinceLastRelease,
    repositoryCreatedAt: m.repositoryCreatedAt,
    openPrsCount: m.openPrsCount,
    stars: m.stars,
    forks: m.forks,
    isArchived: m.isArchived,
  };
}

/**
 * Fetches fresh data from GitHub, computes maintenance score, and persists the assessment.
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
  const maintenanceInput = extractMaintenanceInput(metrics);
  const maintenance = calculateMaintenanceScore(maintenanceInput);

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
      isArchived: metrics.isArchived,
      daysSinceLastCommit: metrics.daysSinceLastCommit,
      commitsLast90Days: metrics.commitsLast90Days,
      daysSinceLastRelease: metrics.daysSinceLastRelease,
      openIssuesPercent: metrics.openIssuesPercent,
      medianIssueResolutionDays: metrics.medianIssueResolutionDays,
      openPrsCount: metrics.openPrsCount,
      issuesCreatedLast90Days: metrics.issuesCreatedLast90Days,
      commitActivity: metrics.commitActivity,
      issueActivity: metrics.issueActivity,
      releases: metrics.releases,
      maintenanceCategory: maintenance.category,
      maintenanceScore: maintenance.score,
      maturityTier: maintenance.maturityTier,
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
        isArchived: metrics.isArchived,
        daysSinceLastCommit: metrics.daysSinceLastCommit,
        commitsLast90Days: metrics.commitsLast90Days,
        daysSinceLastRelease: metrics.daysSinceLastRelease,
        openIssuesPercent: metrics.openIssuesPercent,
        medianIssueResolutionDays: metrics.medianIssueResolutionDays,
        openPrsCount: metrics.openPrsCount,
        issuesCreatedLast90Days: metrics.issuesCreatedLast90Days,
        commitActivity: metrics.commitActivity,
        issueActivity: metrics.issueActivity,
        releases: metrics.releases,
        maintenanceCategory: maintenance.category,
        maintenanceScore: maintenance.score,
        maturityTier: maintenance.maturityTier,
        analyzedAt: new Date(),
      },
    })
    .returning();

  return result;
}
