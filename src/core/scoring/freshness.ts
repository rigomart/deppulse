import type {
  ExpectedActivityTier,
  ScoreCategory,
  ScoringProfile,
} from "./types";

export function getFreshnessMultiplier(
  daysSinceMostRecentActivity: number | null,
  expectedTier: ExpectedActivityTier,
  profile: ScoringProfile,
): number {
  const days = daysSinceMostRecentActivity ?? Number.POSITIVE_INFINITY;
  const steps = profile.freshnessMultipliers[expectedTier];

  for (const step of steps) {
    if (days <= step.maxDays) {
      return step.multiplier;
    }
  }

  return steps.at(-1)?.multiplier ?? 0;
}

export function applyHardCaps(
  rawScore: number,
  expectedTier: ExpectedActivityTier,
  daysSinceMostRecentActivity: number | null,
  profile: ScoringProfile,
): { score: number; hardCapApplied: number | null } {
  if (expectedTier !== "high") {
    return { score: rawScore, hardCapApplied: null };
  }

  const days = daysSinceMostRecentActivity ?? Number.POSITIVE_INFINITY;
  let cappedScore = rawScore;
  let hardCapApplied: number | null = null;

  for (const rule of profile.hardCaps.high) {
    if (days > rule.afterDays) {
      const nextScore = Math.min(cappedScore, rule.maxScore);
      if (nextScore !== cappedScore) {
        hardCapApplied = rule.maxScore;
      }
      cappedScore = nextScore;
    }
  }

  return { score: cappedScore, hardCapApplied };
}

export function getCategoryFromScore(
  score: number,
  profile: ScoringProfile,
): ScoreCategory {
  const thresholds = profile.categoryThresholds;

  if (score >= thresholds.healthy) return "healthy";
  if (score >= thresholds.moderate) return "moderate";
  if (score >= thresholds.declining) return "declining";
  return "inactive";
}
