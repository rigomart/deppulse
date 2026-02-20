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
  releaseRegularity?: number | null;

  // Expected activity signals
  commitsLast30Days?: number;
  commitsLast90Days: number;
  commitsLast365Days?: number;
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
  const commitsLast30Days =
    input.commitsLast30Days ?? Math.max(0, Math.round(input.commitsLast90Days / 3));
  const commitsLast365Days =
    input.commitsLast365Days ??
    Math.max(input.commitsLast90Days, input.commitsLast90Days * 4);

  return {
    lastCommitAt: input.lastCommitAt,
    lastMergedPrAt: input.lastMergedPrAt,
    lastReleaseAt: input.lastReleaseAt,
    openIssuesPercent: input.openIssuesPercent,
    medianIssueResolutionDays: input.medianIssueResolutionDays,
    stars: input.stars,
    repositoryCreatedAt: input.repositoryCreatedAt,
    releasesLastYear: input.releasesLastYear,
    releaseRegularity: input.releaseRegularity ?? null,
    commitsLast30Days,
    commitsLast90Days: input.commitsLast90Days,
    commitsLast365Days,
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
  if (typeof metrics.issuesCreatedLastYear !== "number") {
    throw new Error(
      "Metrics snapshot missing issuesCreatedLastYear. Re-run analysis to compute score.",
    );
  }
  if (typeof metrics.openPrsCount !== "number") {
    throw new Error(
      "Metrics snapshot missing openPrsCount. Re-run analysis to compute score.",
    );
  }

  // Count releases in the last year
  const oneYearAgo = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  const releaseTimesLastYear = metrics.releases
    .map((release) => new Date(release.publishedAt).getTime())
    .filter((publishedAtMs) => publishedAtMs > oneYearAgo)
    .sort((a, b) => a - b);
  const releasesLastYear = releaseTimesLastYear.length;
  const releaseRegularity = computeReleaseRegularity(releaseTimesLastYear);

  const commitsLast30Days =
    typeof metrics.commitsLast30Days === "number"
      ? metrics.commitsLast30Days
      : Math.max(0, Math.round(metrics.commitsLast90Days / 3));
  const commitsLast365Days =
    typeof metrics.commitsLast365Days === "number"
      ? metrics.commitsLast365Days
      : Math.max(metrics.commitsLast90Days, metrics.commitsLast90Days * 4);

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
      releaseRegularity,
      commitsLast30Days,
      commitsLast90Days: metrics.commitsLast90Days,
      commitsLast365Days,
      mergedPrsLast90Days: metrics.mergedPrsLast90Days,
      issuesCreatedLastYear: metrics.issuesCreatedLastYear,
      openPrsCount: metrics.openPrsCount,
      isArchived: metrics.isArchived,
    },
    options,
  );
}

function computeReleaseRegularity(releaseTimes: number[]): number | null {
  if (releaseTimes.length < 3) return null;

  const intervals: number[] = [];
  for (let index = 1; index < releaseTimes.length; index++) {
    const previous = releaseTimes[index - 1];
    const current = releaseTimes[index];
    if (previous === undefined || current === undefined) continue;
    const intervalDays = (current - previous) / (24 * 60 * 60 * 1000);
    if (intervalDays > 0) intervals.push(intervalDays);
  }

  if (intervals.length < 2) return null;

  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (mean <= 0) return null;

  const variance =
    intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  if (coefficientOfVariation <= 0.25) return 1;
  if (coefficientOfVariation <= 0.5) return 0.85;
  if (coefficientOfVariation <= 0.75) return 0.65;
  if (coefficientOfVariation <= 1) return 0.45;
  return 0.25;
}
