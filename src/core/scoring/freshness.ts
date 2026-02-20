import type {
  ExpectedActivityTier,
  FreshnessStep,
  ScoreCategory,
  ScoringProfile,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function interpolateLinear(
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  if (x1 <= x0) return y1;
  const t = clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + (y1 - y0) * t;
}

function interpolateFreshnessSteps(days: number, steps: FreshnessStep[]): number {
  const firstStep = steps[0];
  if (!firstStep) return 0;

  if (days <= firstStep.maxDays) {
    return firstStep.multiplier;
  }

  let previousStep = firstStep;
  for (const step of steps.slice(1)) {
    if (!Number.isFinite(step.maxDays)) {
      return step.multiplier;
    }

    if (days <= step.maxDays) {
      return interpolateLinear(
        days,
        previousStep.maxDays,
        step.maxDays,
        previousStep.multiplier,
        step.multiplier,
      );
    }

    previousStep = step;
  }

  return steps.at(-1)?.multiplier ?? 0;
}

export function getFreshnessMultiplier(
  daysSinceMostRecentActivity: number | null,
  expectedTier: ExpectedActivityTier,
  profile: ScoringProfile,
): number {
  const days = daysSinceMostRecentActivity ?? Number.POSITIVE_INFINITY;
  const steps = profile.freshnessMultipliers[expectedTier];
  return interpolateFreshnessSteps(days, steps);
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
