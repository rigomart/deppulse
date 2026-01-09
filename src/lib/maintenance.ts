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
  /** Weekly commit activity (52 weeks, most recent first) */
  commitActivity: Array<{ week: string; commits: number }>;

  // Responsiveness metrics
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  issuesCreatedLastYear: number;

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

  // Mature: 5+ years OR 10k+ popularity (established projects deserve lenient thresholds)
  if (
    ageYears >= maturityCriteria.matureMinAgeYears ||
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
  if (days <= thresholds[1]) return Math.round(maxPoints * 0.5);
  if (days <= thresholds[2]) return Math.round(maxPoints * 0.2);
  if (days <= thresholds[3]) return Math.round(maxPoints * 0.05);
  return 0;
}

/**
 * Scores commit volume based on tier-specific timeframes.
 * Different tiers look at different time windows:
 * - Emerging: 13 weeks (3 months) - recent activity matters most
 * - Growing: 26 weeks (6 months) - balanced view
 * - Mature: 52 weeks (12 months) - allows for gaps
 */
function scoreCommitVolume(
  commitActivity: Array<{ week: string; commits: number }>,
  tier: MaturityTier,
): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.activity.commitVolume;
  const { weeks, thresholds } =
    MAINTENANCE_CONFIG.maturityTiers[tier].commitVolume;

  // Slice to the tier-specific timeframe (most recent N weeks)
  const recentActivity = commitActivity.slice(0, weeks);
  const commits = recentActivity.reduce((sum, week) => sum + week.commits, 0);

  if (commits >= thresholds[0]) return maxPoints;
  if (commits >= thresholds[1]) return Math.round(maxPoints * 0.45);
  if (commits >= thresholds[2]) return Math.round(maxPoints * 0.15);
  return 0;
}

/**
 * Scores issue resolution time (median days to close issues).
 * No recently closed issues = 0 points (no free points for lack of data).
 */
function scoreIssueResolution(days: number | null): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.responsiveness.issueResolution;
  const thresholds = MAINTENANCE_CONFIG.issueResolution;

  // No recently closed issues = no evidence of responsiveness
  if (days === null) return 0;

  if (days <= thresholds.excellent) return maxPoints;
  if (days <= thresholds.good) return Math.round(maxPoints * 0.8);
  if (days <= thresholds.fair) return Math.round(maxPoints * 0.5);
  if (days <= thresholds.poor) return Math.round(maxPoints * 0.25);
  return 0;
}

/**
 * Scores release recency based on maturity tier thresholds.
 * No releases = 0 points (well-maintained projects use releases).
 */
function scoreReleaseRecency(days: number | null, tier: MaturityTier): number {
  const maxPoints = MAINTENANCE_CONFIG.weights.stability.releaseRecency;
  const thresholds = MAINTENANCE_CONFIG.maturityTiers[tier].releaseDays;

  // No releases = no evidence of release management
  if (days === null) return 0;

  if (days <= thresholds[0]) return maxPoints;
  if (days <= thresholds[1]) return Math.round(maxPoints * 0.5);
  if (days <= thresholds[2]) return Math.round(maxPoints * 0.15);
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
 * Exported for use when computing category from stored score.
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
 * Higher score = better maintained (0-100 scale).
 */
export function calculateMaintenanceScore(
  input: MaintenanceInput,
): MaintenanceResult {
  // Hard override: archived repos always score 0
  if (input.isArchived) {
    return {
      score: 0,
      category: "inactive",
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
    scoreCommitVolume(input.commitActivity, maturityTier);

  const responsivenessScore = scoreIssueResolution(
    input.medianIssueResolutionDays,
  );

  const stabilityScore =
    scoreReleaseRecency(input.daysSinceLastRelease, maturityTier) +
    scoreProjectAge(input.repositoryCreatedAt);

  const communityScore = scorePopularity(input.stars, input.forks);

  // Total score (capped at 100)
  const score = Math.min(
    100,
    activityScore + responsivenessScore + stabilityScore + communityScore,
  );

  return {
    score,
    category: getCategoryFromScore(score),
    maturityTier,
  };
}
