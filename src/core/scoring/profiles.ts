import type { QualityWeights, ScoringProfile, ScoringProfileId } from "./types";

export const STRICT_BALANCED_PROFILE: ScoringProfile = {
  id: "strict-balanced",
  label: "Strict Balanced",
  categoryThresholds: {
    healthy: 70,
    moderate: 45,
    declining: 25,
  },
  qualityWeights: {
    issueHealth: 0.3,
    releaseHealth: 0.25,
    community: 0.15,
    maturity: 0.1,
    activityBreadth: 0.2,
  },
  issueHealthSplit: {
    openRatio: 0.5,
    resolutionSpeed: 0.5,
  },
  qualityThresholds: {
    issueResolutionDays: {
      excellent: 7,
      good: 14,
      fair: 30,
      poor: 60,
    },
    openIssuesRatio: {
      excellent: 20,
      good: 40,
      fair: 60,
      poor: 80,
    },
    popularityStars: {
      excellent: 25_000,
      good: 5_000,
      fair: 500,
      poor: 50,
      minimal: 10,
    },
    projectAgeYears: {
      mature: 5,
      established: 3,
      growing: 1,
      newer: 0.5,
    },
    releaseCadencePerYear: {
      excellent: 6,
      good: 3,
      fair: 1,
    },
    activityBreadthFractions: [0, 0.35, 0.7, 1],
  },
  expectedActivityCriteria: {
    high: {
      commitsLast90Days: 15,
      mergedPrsLast90Days: 8,
      issuesCreatedLastYear: 36,
      openPrsCount: 12,
      stars: 3000,
    },
    medium: {
      commitsLast90Days: 4,
      mergedPrsLast90Days: 2,
      issuesCreatedLastYear: 12,
      openPrsCount: 4,
      stars: 500,
    },
  },
  freshnessMultipliers: {
    high: [
      { maxDays: 30, multiplier: 1 },
      { maxDays: 90, multiplier: 0.75 },
      { maxDays: 180, multiplier: 0.35 },
      { maxDays: 365, multiplier: 0.15 },
      { maxDays: Number.POSITIVE_INFINITY, multiplier: 0.05 },
    ],
    medium: [
      { maxDays: 45, multiplier: 1 },
      { maxDays: 120, multiplier: 0.8 },
      { maxDays: 180, multiplier: 0.5 },
      { maxDays: 365, multiplier: 0.22 },
      { maxDays: Number.POSITIVE_INFINITY, multiplier: 0.08 },
    ],
    low: [
      { maxDays: 90, multiplier: 1 },
      { maxDays: 180, multiplier: 0.8 },
      { maxDays: 365, multiplier: 0.5 },
      { maxDays: 730, multiplier: 0.2 },
      { maxDays: Number.POSITIVE_INFINITY, multiplier: 0.1 },
    ],
  },
  hardCaps: {
    high: [
      { afterDays: 180, maxScore: 35 },
      { afterDays: 365, maxScore: 20 },
    ],
  },
};

export const SCORING_PROFILES: Record<ScoringProfileId, ScoringProfile> = {
  "strict-balanced": STRICT_BALANCED_PROFILE,
};

export function getScoringProfile(profileId: ScoringProfileId): ScoringProfile {
  return SCORING_PROFILES[profileId];
}

export function getDefaultScoringProfile(): ScoringProfile {
  return STRICT_BALANCED_PROFILE;
}

export function normalizeQualityWeights(
  weights: QualityWeights,
): QualityWeights {
  const total =
    weights.issueHealth +
    weights.releaseHealth +
    weights.community +
    weights.maturity +
    weights.activityBreadth;

  if (total <= 0) {
    return {
      issueHealth: 0.2,
      releaseHealth: 0.2,
      community: 0.2,
      maturity: 0.2,
      activityBreadth: 0.2,
    };
  }

  return {
    issueHealth: weights.issueHealth / total,
    releaseHealth: weights.releaseHealth / total,
    community: weights.community / total,
    maturity: weights.maturity / total,
    activityBreadth: weights.activityBreadth / total,
  };
}

export function normalizeIssueHealthSplit(split: {
  openRatio: number;
  resolutionSpeed: number;
}): { openRatio: number; resolutionSpeed: number } {
  const total = split.openRatio + split.resolutionSpeed;

  if (total <= 0) {
    return {
      openRatio: 0.5,
      resolutionSpeed: 0.5,
    };
  }

  return {
    openRatio: split.openRatio / total,
    resolutionSpeed: split.resolutionSpeed / total,
  };
}
