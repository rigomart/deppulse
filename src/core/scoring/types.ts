export type ScoreCategory = "healthy" | "moderate" | "declining" | "inactive";

export type ExpectedActivityTier = "high" | "medium" | "low";

export type ScoringProfileId = "strict-balanced";

export interface ScoringInput {
  // Activity timestamps
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

  // Overrides
  isArchived: boolean;
}

export interface CategoryThresholds {
  healthy: number;
  moderate: number;
  declining: number;
}

export interface QualityWeights {
  issueHealth: number;
  releaseHealth: number;
  community: number;
  maturity: number;
  activityBreadth: number;
}

export interface IssueHealthSplit {
  openRatio: number;
  resolutionSpeed: number;
}

export interface ExpectedActivityCriteria {
  commitsLast90Days: number;
  mergedPrsLast90Days: number;
  issuesCreatedLastYear: number;
  openPrsCount: number;
}

export interface FreshnessStep {
  maxDays: number;
  multiplier: number;
}

export interface HardCapRule {
  afterDays: number;
  maxScore: number;
}

export interface QualityThresholds {
  issueResolutionDays: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  openIssuesRatio: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  popularityStars: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    minimal: number;
  };
  projectAgeYears: {
    mature: number;
    established: number;
    growing: number;
    newer: number;
  };
  releaseCadencePerYear: {
    excellent: number;
    good: number;
    fair: number;
  };
  activityBreadthFractions: [number, number, number, number];
}

export interface ScoringProfile {
  id: ScoringProfileId;
  label: string;
  categoryThresholds: CategoryThresholds;
  qualityWeights: QualityWeights;
  issueHealthSplit: IssueHealthSplit;
  qualityThresholds: QualityThresholds;
  expectedActivityCriteria: {
    high: ExpectedActivityCriteria;
    medium: ExpectedActivityCriteria;
  };
  freshnessMultipliers: Record<ExpectedActivityTier, FreshnessStep[]>;
  hardCaps: {
    high: HardCapRule[];
  };
}

export interface ScoreOptions {
  profileId?: ScoringProfileId;
  now?: Date;
}

export interface ScoreBreakdown {
  quality: number;
  freshnessMultiplier: number;
  expectedActivityTier: ExpectedActivityTier;
  hardCapApplied: number | null;
  daysSinceMostRecentActivity: number | null;
}

export interface ScoreResult {
  score: number;
  category: ScoreCategory;
  breakdown: ScoreBreakdown;
}

export interface QualitySignalScores {
  issueHealth: number;
  releaseHealth: number;
  community: number;
  maturity: number;
  activityBreadth: number;
}

export interface QualityComputation {
  quality: number;
  signals: QualitySignalScores;
  normalizedWeights: QualityWeights;
}
