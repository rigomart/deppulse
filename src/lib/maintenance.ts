import {
  MAINTENANCE_CATEGORY_INFO,
  MAINTENANCE_CONFIG,
  type MaintenanceCategory,
  type MaturityTier,
} from "./maintenance-config";

export type { MaintenanceCategory, MaturityTier };
export { MAINTENANCE_CATEGORY_INFO };

/**
 * Input metrics for maintenance score calculation.
 */
export interface MaintenanceInput {
  // Activity metrics
  daysSinceLastCommit: number | null;
  commitsLast90Days: number;

  // Responsiveness metrics
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  issuesCreatedLast90Days: number;

  // Stability metrics
  daysSinceLastRelease: number | null;
  repositoryCreatedAt: Date | null;

  // Community metrics
  openPrsCount: number;
  stars: number;
  forks: number;

  // Special case
  isArchived: boolean;
}

/**
 * Result of maintenance score calculation.
 */
export interface MaintenanceResult {
  score: number;
  category: MaintenanceCategory;
  maturityTier: MaturityTier;
}

/**
 * Determines the maturity tier of a repository based on age and popularity.
 */
export function determineMaturityTier(
  createdAt: Date | null,
  stars: number,
  forks: number,
): MaturityTier {
  const { maturityCriteria } = MAINTENANCE_CONFIG;

  const now = Date.now();
  const createdTime =
    createdAt?.getTime() ?? now - 2 * 365 * 24 * 60 * 60 * 1000;
  const ageYears = (now - createdTime) / (365.25 * 24 * 60 * 60 * 1000);

  const popularitySignal = stars + forks * 2;

  // Mature: 5+ years AND 10k+ stars
  if (
    ageYears >= maturityCriteria.matureMinAgeYears &&
    popularitySignal >= maturityCriteria.matureMinStars
  ) {
    return "mature";
  }

  // Growing: 2+ years OR 1k+ stars
  if (
    ageYears >= maturityCriteria.growingMinAgeYears ||
    popularitySignal >= maturityCriteria.growingMinStars
  ) {
    return "growing";
  }

  return "emerging";
}

/**
 * Scores last commit recency based on maturity tier thresholds.
 * Returns points from 0 to weights.activity.lastCommit
 */
function scoreLastCommit(days: number | null, tier: MaturityTier): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.activity.lastCommit;
  const thresholds = MAINTENANCE_CONFIG.maturityTiers[tier].commitDays;

  if (days === null) return 0; // No commits = no points

  if (days <= thresholds[0]) return maxPoints;
  if (days <= thresholds[1]) return Math.round(maxPoints * 0.7);
  if (days <= thresholds[2]) return Math.round(maxPoints * 0.4);
  if (days <= thresholds[3]) return Math.round(maxPoints * 0.15);
  return 0;
}

/**
 * Scores commit volume in the last 90 days based on maturity tier thresholds.
 */
function scoreCommitVolume(commits: number, tier: MaturityTier): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.activity.commitVolume;
  const thresholds = MAINTENANCE_CONFIG.maturityTiers[tier].commitVolume;

  if (commits >= thresholds[0]) return maxPoints;
  if (commits >= thresholds[1]) return Math.round(maxPoints * 0.65);
  if (commits >= thresholds[2]) return Math.round(maxPoints * 0.3);
  return 0;
}

/**
 * Scores issue resolution time (median days to close issues).
 */
function scoreIssueResolution(days: number | null): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.responsiveness.issueResolution;
  const thresholds = MAINTENANCE_CONFIG.issueResolution;

  // No closed issues = neutral (give partial points)
  if (days === null) return Math.round(maxPoints * 0.65);

  if (days <= thresholds.excellent) return maxPoints;
  if (days <= thresholds.good) return Math.round(maxPoints * 0.8);
  if (days <= thresholds.fair) return Math.round(maxPoints * 0.5);
  if (days <= thresholds.poor) return Math.round(maxPoints * 0.25);
  return 0;
}

/**
 * Scores open issues percentage.
 */
function scoreOpenIssuesPercent(percent: number | null): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.responsiveness.openIssuesPercent;
  const thresholds = MAINTENANCE_CONFIG.openIssuesPercent;

  // No issues at all = slight positive (give most points)
  if (percent === null) return Math.round(maxPoints * 0.75);

  if (percent <= thresholds.excellent) return maxPoints;
  if (percent <= thresholds.good) return Math.round(maxPoints * 0.75);
  if (percent <= thresholds.fair) return Math.round(maxPoints * 0.4);
  if (percent <= thresholds.poor) return Math.round(maxPoints * 0.15);
  return 0;
}

/**
 * Scores issue velocity (issues created in last 90 days).
 * Lower velocity = higher score (indicates finished or stable project).
 */
function scoreIssueVelocity(issuesCreated: number): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.responsiveness.issueVelocity;
  const thresholds = MAINTENANCE_CONFIG.issueVelocity;

  if (issuesCreated <= thresholds.low) return maxPoints;
  if (issuesCreated <= thresholds.medium) return Math.round(maxPoints * 0.65);
  if (issuesCreated <= thresholds.high) return Math.round(maxPoints * 0.3);
  return 0;
}

/**
 * Scores release recency based on maturity tier thresholds.
 */
function scoreReleaseRecency(days: number | null, tier: MaturityTier): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.stability.releaseRecency;
  const thresholds = MAINTENANCE_CONFIG.maturityTiers[tier].releaseDays;

  // No releases = neutral (some projects don't use releases)
  if (days === null) return Math.round(maxPoints * 0.65);

  if (days <= thresholds[0]) return maxPoints;
  if (days <= thresholds[1]) return Math.round(maxPoints * 0.65);
  if (days <= thresholds[2]) return Math.round(maxPoints * 0.3);
  return 0;
}

/**
 * Scores project age (older = more stable/proven).
 */
function scoreProjectAge(createdAt: Date | null): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.stability.projectAge;
  const thresholds = MAINTENANCE_CONFIG.projectAge;

  if (!createdAt) return Math.round(maxPoints * 0.5); // Unknown age = neutral

  const ageYears =
    (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (ageYears >= thresholds.mature) return maxPoints;
  if (ageYears >= thresholds.established) return Math.round(maxPoints * 0.8);
  if (ageYears >= thresholds.growing) return Math.round(maxPoints * 0.5);
  if (ageYears >= thresholds.new) return Math.round(maxPoints * 0.25);
  return Math.round(maxPoints * 0.1); // Very new projects still get some points
}

/**
 * Scores open PRs count.
 */
function scoreOpenPrs(count: number): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.community.openPrs;
  const thresholds = MAINTENANCE_CONFIG.openPrs;

  if (count <= thresholds.excellent) return maxPoints;
  if (count <= thresholds.good) return Math.round(maxPoints * 0.7);
  if (count <= thresholds.fair) return Math.round(maxPoints * 0.4);
  return 0;
}

/**
 * Scores popularity based on stars and forks.
 */
function scorePopularity(stars: number, forks: number): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.community.popularity;
  const thresholds = MAINTENANCE_CONFIG.popularity;
  const signal = stars + forks * 2;

  if (signal >= thresholds.excellent) return maxPoints;
  if (signal >= thresholds.good) return Math.round(maxPoints * 0.85);
  if (signal >= thresholds.fair) return Math.round(maxPoints * 0.7);
  if (signal >= thresholds.poor) return Math.round(maxPoints * 0.5);
  if (signal >= thresholds.minimal) return Math.round(maxPoints * 0.3);
  return Math.round(maxPoints * 0.1); // Any project gets minimal points
}

/**
 * Determines category from score.
 */
function categoryFromScore(score: number): MaintenanceCategory {
  const { categoryThresholds } = MAINTENANCE_CONFIG;

  if (score >= categoryThresholds.excellent) return "excellent";
  if (score >= categoryThresholds.good) return "good";
  if (score >= categoryThresholds.fair) return "fair";
  if (score >= categoryThresholds.poor) return "poor";
  return "critical";
}

/**
 * Calculates the maintenance score for a repository.
 * Higher score = better maintained (0-100 scale).
 */
export function calculateMaintenanceScore(
  input: MaintenanceInput,
): MaintenanceResult {
  // Hard override: archived repos always score 0
  if (input.isArchived) {
    return {
      score: 0,
      category: "critical",
      maturityTier: "mature", // Archived repos were typically mature
    };
  }

  // Determine maturity tier for threshold adjustments
  const maturityTier = determineMaturityTier(
    input.repositoryCreatedAt,
    input.stars,
    input.forks,
  );

  // Calculate component scores
  const activityScore =
    scoreLastCommit(input.daysSinceLastCommit, maturityTier) +
    scoreCommitVolume(input.commitsLast90Days, maturityTier);

  const responsivenessScore =
    scoreIssueResolution(input.medianIssueResolutionDays) +
    scoreOpenIssuesPercent(input.openIssuesPercent) +
    scoreIssueVelocity(input.issuesCreatedLast90Days);

  const stabilityScore =
    scoreReleaseRecency(input.daysSinceLastRelease, maturityTier) +
    scoreProjectAge(input.repositoryCreatedAt);

  const communityScore =
    scoreOpenPrs(input.openPrsCount) +
    scorePopularity(input.stars, input.forks);

  // Total score (capped at 100)
  const score = Math.min(
    100,
    activityScore + responsivenessScore + stabilityScore + communityScore,
  );

  return {
    score,
    category: categoryFromScore(score),
    maturityTier,
  };
}
