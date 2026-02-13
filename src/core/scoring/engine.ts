import {
  applyHardCaps,
  getCategoryFromScore,
  getFreshnessMultiplier,
} from "./freshness";
import { getDefaultScoringProfile, getScoringProfile } from "./profiles";
import { computeQualityScore } from "./quality";
import {
  determineExpectedActivityTier,
  getDaysSinceMostRecentActivity,
} from "./signals";
import type {
  ScoreOptions,
  ScoreResult,
  ScoringInput,
  ScoringProfile,
} from "./types";

function resolveProfile(options?: ScoreOptions): ScoringProfile {
  if (!options?.profileId) {
    return getDefaultScoringProfile();
  }

  return getScoringProfile(options.profileId);
}

export function calculateScore(
  input: ScoringInput,
  options?: ScoreOptions,
): ScoreResult {
  const now = options?.now ?? new Date();
  const profile = resolveProfile(options);

  const expectedActivityTier = determineExpectedActivityTier(input, profile);
  const daysSinceMostRecentActivity = getDaysSinceMostRecentActivity(
    input,
    now,
  );

  if (input.isArchived) {
    return {
      score: 0,
      category: "inactive",
      breakdown: {
        quality: 0,
        freshnessMultiplier: 0,
        expectedActivityTier,
        hardCapApplied: null,
        daysSinceMostRecentActivity,
      },
    };
  }

  const { quality } = computeQualityScore(input, profile, now);
  const freshnessMultiplier = getFreshnessMultiplier(
    daysSinceMostRecentActivity,
    expectedActivityTier,
    profile,
  );

  const rawScore = Math.min(100, Math.round(quality * freshnessMultiplier));
  const capped = applyHardCaps(
    rawScore,
    expectedActivityTier,
    daysSinceMostRecentActivity,
    profile,
  );

  return {
    score: capped.score,
    category: getCategoryFromScore(capped.score, profile),
    breakdown: {
      quality,
      freshnessMultiplier,
      expectedActivityTier,
      hardCapApplied: capped.hardCapApplied,
      daysSinceMostRecentActivity,
    },
  };
}
