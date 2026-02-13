import type { MetricsSnapshot } from "./domain/assessment";
import {
  MAINTENANCE_CATEGORY_INFO,
  MAINTENANCE_CONFIG,
  type MaintenanceCategory,
} from "./maintenance-config";

export type { MaintenanceCategory };
export { MAINTENANCE_CATEGORY_INFO };

/**
 * Input metrics for maintenance score calculation.
 */
export interface MaintenanceInput {
  // Engagement signals (dates of last activity per channel)
  lastCommitAt: Date | null;
  lastMergedPrAt: Date | null;
  lastReleaseAt: Date | null;

  // Quality signals
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  stars: number;
  repositoryCreatedAt: Date | null;
  releasesLastYear: number;

  // Special case
  isArchived: boolean;
}

/**
 * Result of maintenance score calculation.
 */
export interface MaintenanceResult {
  score: number;
  category: MaintenanceCategory;
}

// --- Engagement ---

/**
 * Computes the engagement factor (0-1) based on the most recent
 * maintenance activity across all channels.
 */
export function computeEngagementFactor(input: MaintenanceInput): number {
  const dates = [
    input.lastCommitAt,
    input.lastMergedPrAt,
    input.lastReleaseAt,
  ].filter((d): d is Date => d !== null);

  if (dates.length === 0) {
    return MAINTENANCE_CONFIG.engagementThresholds.at(-1)?.factor ?? 0.25;
  }

  const mostRecentMs = Math.max(...dates.map((d) => d.getTime()));
  const daysSince = Math.floor(
    (Date.now() - mostRecentMs) / (1000 * 60 * 60 * 24),
  );

  for (const { maxDays, factor } of MAINTENANCE_CONFIG.engagementThresholds) {
    if (daysSince <= maxDays) return factor;
  }

  return MAINTENANCE_CONFIG.engagementThresholds.at(-1)?.factor ?? 0.25;
}

// --- Quality dimensions ---

/**
 * Scores open issues ratio. Null = neutral (50%).
 */
function scoreOpenIssuesRatio(percent: number | null): number {
  const maxPoints = MAINTENANCE_CONFIG.quality.issueHealth.openRatio;
  const thresholds = MAINTENANCE_CONFIG.openIssuesRatio;

  if (percent === null) return Math.round(maxPoints * 0.5);

  if (percent <= thresholds.excellent) return maxPoints;
  if (percent <= thresholds.good) return Math.round(maxPoints * 0.7);
  if (percent <= thresholds.fair) return Math.round(maxPoints * 0.4);
  if (percent <= thresholds.poor) return Math.round(maxPoints * 0.15);
  return 0;
}

/**
 * Scores issue resolution speed.
 * Null with open issues = 0 pts (no data is a bad sign).
 * Null with no open issues = neutral (50%).
 */
function scoreIssueResolution(
  days: number | null,
  openIssuesPercent: number | null,
): number {
  const maxPoints = MAINTENANCE_CONFIG.quality.issueHealth.resolutionSpeed;
  const thresholds = MAINTENANCE_CONFIG.issueResolution;

  if (days === null) {
    const hasOpenIssues = openIssuesPercent !== null && openIssuesPercent > 0;
    return hasOpenIssues ? 0 : Math.round(maxPoints * 0.5);
  }

  if (days <= thresholds.excellent) return maxPoints;
  if (days <= thresholds.good) return Math.round(maxPoints * 0.8);
  if (days <= thresholds.fair) return Math.round(maxPoints * 0.5);
  if (days <= thresholds.poor) return Math.round(maxPoints * 0.25);
  return 0;
}

/**
 * Scores release cadence (releases per year).
 */
function scoreReleaseCadence(releasesLastYear: number): number {
  const maxPoints = MAINTENANCE_CONFIG.quality.releaseHealth.cadence;
  const thresholds = MAINTENANCE_CONFIG.releaseCadence;

  if (releasesLastYear >= thresholds.excellent) return maxPoints;
  if (releasesLastYear >= thresholds.good) return Math.round(maxPoints * 0.75);
  if (releasesLastYear >= thresholds.fair) return Math.round(maxPoints * 0.4);
  return 0;
}

/**
 * Scores popularity based on stars.
 */
function scorePopularity(stars: number): number {
  const maxPoints = MAINTENANCE_CONFIG.quality.community.stars;
  const thresholds = MAINTENANCE_CONFIG.popularity;

  if (stars >= thresholds.excellent) return maxPoints;
  if (stars >= thresholds.good) return Math.round(maxPoints * 0.85);
  if (stars >= thresholds.fair) return Math.round(maxPoints * 0.7);
  if (stars >= thresholds.poor) return Math.round(maxPoints * 0.5);
  if (stars >= thresholds.minimal) return Math.round(maxPoints * 0.3);
  return Math.round(maxPoints * 0.1);
}

/**
 * Scores project age (older = more established).
 */
function scoreProjectAge(createdAt: Date | null): number {
  const maxPoints = MAINTENANCE_CONFIG.quality.maturity.age;
  const thresholds = MAINTENANCE_CONFIG.projectAge;

  if (!createdAt) return Math.round(maxPoints * 0.5);

  const ageYears =
    (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (ageYears >= thresholds.mature) return maxPoints;
  if (ageYears >= thresholds.established) return Math.round(maxPoints * 0.8);
  if (ageYears >= thresholds.growing) return Math.round(maxPoints * 0.6);
  if (ageYears >= thresholds.new) return Math.round(maxPoints * 0.3);
  return Math.round(maxPoints * 0.1);
}

/**
 * Scores activity breadth: how many maintenance channels showed
 * activity in the last year (commits, PR merges, releases).
 */
function scoreActivityBreadth(input: MaintenanceInput): number {
  const maxPoints = MAINTENANCE_CONFIG.quality.activityBreadth.total;
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - oneYearMs;

  let activeChannels = 0;
  if (input.lastCommitAt && input.lastCommitAt.getTime() > cutoff)
    activeChannels++;
  if (input.lastMergedPrAt && input.lastMergedPrAt.getTime() > cutoff)
    activeChannels++;
  if (input.lastReleaseAt && input.lastReleaseAt.getTime() > cutoff)
    activeChannels++;

  // 0 channels = 0, 1 = 35%, 2 = 70%, 3 = 100%
  const fractions = [0, 0.35, 0.7, 1.0];
  return Math.round(maxPoints * fractions[activeChannels]);
}

/**
 * Computes the quality score (0-100) across all dimensions.
 */
export function computeQualityScore(input: MaintenanceInput): number {
  return (
    scoreOpenIssuesRatio(input.openIssuesPercent) +
    scoreIssueResolution(
      input.medianIssueResolutionDays,
      input.openIssuesPercent,
    ) +
    scoreReleaseCadence(input.releasesLastYear) +
    scorePopularity(input.stars) +
    scoreProjectAge(input.repositoryCreatedAt) +
    scoreActivityBreadth(input)
  );
}

/**
 * Determines category from score.
 */
export function getCategoryFromScore(score: number): MaintenanceCategory {
  const { categoryThresholds } = MAINTENANCE_CONFIG;

  if (score >= categoryThresholds.healthy) return "healthy";
  if (score >= categoryThresholds.moderate) return "moderate";
  if (score >= categoryThresholds.declining) return "declining";
  return "inactive";
}

/**
 * Calculates the maintenance score for a repository.
 *
 * Score = quality × engagement
 * - Quality (0-100): issue health, release cadence, community, maturity, activity breadth
 * - Engagement (0-1): how recently ANY maintenance activity occurred
 */
export function calculateMaintenanceScore(
  input: MaintenanceInput,
): MaintenanceResult {
  // Hard override: archived repos always score 0
  if (input.isArchived) {
    return { score: 0, category: "inactive" };
  }

  const engagement = computeEngagementFactor(input);
  const quality = computeQualityScore(input);
  const score = Math.min(100, Math.round(quality * engagement));

  return {
    score,
    category: getCategoryFromScore(score),
  };
}

/**
 * Computes a maintenance score from a stored MetricsSnapshot.
 * Handles ISO string → Date conversion and derived metric computation.
 */
export function computeScoreFromMetrics(
  metrics: MetricsSnapshot,
): MaintenanceResult {
  // Count releases in the last year
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const releasesLastYear = metrics.releases.filter(
    (r) => new Date(r.publishedAt).getTime() > oneYearAgo,
  ).length;

  return calculateMaintenanceScore({
    lastCommitAt: metrics.lastCommitAt ? new Date(metrics.lastCommitAt) : null,
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
    isArchived: metrics.isArchived,
  });
}
