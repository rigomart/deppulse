import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { calculateScore } from "../scoring";
import type {
  ScoreBreakdown,
  ScoreOptions,
  ScoringInput,
  ScoringProfileId,
} from "../scoring/types";
import {
  MAINTENANCE_CATEGORY_INFO,
  type MaintenanceCategory,
} from "./maintenance-config";

export type { MaintenanceCategory };
export type { ScoreOptions, ScoringProfileId };
export { MAINTENANCE_CATEGORY_INFO };

/**
 * Input metrics for maintenance score calculation.
 * Kept separate from `ScoringInput` to preserve a stable maintenance-facing API.
 */
export interface MaintenanceInput {
  // Activity signals
  lastCommitAt: Date | null;
  lastMergedPrAt: Date | null;
  lastReleaseAt: Date | null;

  // Quality signals
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  stars: number;
  repositoryCreatedAt: Date | null;
  releasesLastYear: number;

  // Expected activity signals
  commitsLast90Days: number;
  mergedPrsLast90Days: number;
  issuesCreatedLastYear: number;
  openPrsCount: number;

  // Special case
  isArchived: boolean;
}

/**
 * Result of maintenance score calculation.
 */
export interface MaintenanceResult {
  score: number;
  category: MaintenanceCategory;
  breakdown: ScoreBreakdown;
}

function toScoringInput(input: MaintenanceInput): ScoringInput {
  return {
    lastCommitAt: input.lastCommitAt,
    lastMergedPrAt: input.lastMergedPrAt,
    lastReleaseAt: input.lastReleaseAt,
    openIssuesPercent: input.openIssuesPercent,
    medianIssueResolutionDays: input.medianIssueResolutionDays,
    stars: input.stars,
    repositoryCreatedAt: input.repositoryCreatedAt,
    releasesLastYear: input.releasesLastYear,
    commitsLast90Days: input.commitsLast90Days,
    mergedPrsLast90Days: input.mergedPrsLast90Days,
    issuesCreatedLastYear: input.issuesCreatedLastYear,
    openPrsCount: input.openPrsCount,
    isArchived: input.isArchived,
  };
}

/**
 * Calculates the maintenance score for a repository.
 */
export function calculateMaintenanceScore(
  input: MaintenanceInput,
  options?: ScoreOptions,
): MaintenanceResult {
  const result = calculateScore(toScoringInput(input), options);

  return {
    score: result.score,
    category: result.category,
    breakdown: result.breakdown,
  };
}

/**
 * Computes a maintenance score from a stored MetricsSnapshot.
 */
export function computeScoreFromMetrics(
  metrics: MetricsSnapshot,
  options?: ScoreOptions,
): MaintenanceResult {
  const now = options?.now ?? new Date();

  if (typeof metrics.commitsLast90Days !== "number") {
    throw new Error(
      "Metrics snapshot missing commitsLast90Days. Re-run analysis to compute score.",
    );
  }
  if (typeof metrics.mergedPrsLast90Days !== "number") {
    throw new Error(
      "Metrics snapshot missing mergedPrsLast90Days. Re-run analysis to compute score.",
    );
  }

  // Count releases in the last year
  const oneYearAgo = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  const releasesLastYear = metrics.releases.filter(
    (release) => new Date(release.publishedAt).getTime() > oneYearAgo,
  ).length;

  return calculateMaintenanceScore(
    {
      lastCommitAt: metrics.lastCommitAt
        ? new Date(metrics.lastCommitAt)
        : null,
      lastMergedPrAt: metrics.lastMergedPrAt
        ? new Date(metrics.lastMergedPrAt)
        : null,
      lastReleaseAt: metrics.lastReleaseAt
        ? new Date(metrics.lastReleaseAt)
        : null,
      openIssuesPercent: metrics.openIssuesPercent,
      medianIssueResolutionDays: metrics.medianIssueResolutionDays,
      stars: metrics.stars,
      repositoryCreatedAt: metrics.repositoryCreatedAt
        ? new Date(metrics.repositoryCreatedAt)
        : null,
      releasesLastYear,
      commitsLast90Days: metrics.commitsLast90Days,
      mergedPrsLast90Days: metrics.mergedPrsLast90Days,
      issuesCreatedLastYear: metrics.issuesCreatedLastYear,
      openPrsCount: metrics.openPrsCount,
      isArchived: metrics.isArchived,
    },
    options,
  );
}
