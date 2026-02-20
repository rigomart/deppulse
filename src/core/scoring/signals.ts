import type {
  ExpectedActivityCriteria,
  ExpectedActivityTier,
  ScoringInput,
  ScoringProfile,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDaysSince(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

export function getMostRecentActivityDate(input: ScoringInput): Date | null {
  const dates = [input.lastCommitAt, input.lastMergedPrAt, input.lastReleaseAt]
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0] ?? null;
}

export function getDaysSinceMostRecentActivity(
  input: ScoringInput,
  now: Date,
): number | null {
  return toDaysSince(getMostRecentActivityDate(input), now);
}

export function computeActivityBreadth(
  input: ScoringInput,
  now: Date,
  fractions: [number, number, number, number],
): number {
  const cutoff = now.getTime() - 365 * DAY_MS;

  let activeChannels = 0;
  if (input.lastCommitAt && input.lastCommitAt.getTime() > cutoff) {
    activeChannels++;
  }
  if (input.lastMergedPrAt && input.lastMergedPrAt.getTime() > cutoff) {
    activeChannels++;
  }
  if (input.lastReleaseAt && input.lastReleaseAt.getTime() > cutoff) {
    activeChannels++;
  }

  return fractions[activeChannels];
}

function meetsAny(
  input: ScoringInput,
  criteria: ExpectedActivityCriteria,
): boolean {
  const commitsLast30Days =
    typeof input.commitsLast30Days === "number"
      ? input.commitsLast30Days
      : Math.max(0, Math.round(input.commitsLast90Days / 3));
  const commitsLast365Days =
    typeof input.commitsLast365Days === "number"
      ? input.commitsLast365Days
      : input.commitsLast90Days * 4;

  if (criteria.commitsLast90Days === 0) return true;

  const commitsLast30DaysThreshold = Math.max(
    1,
    Math.ceil(criteria.commitsLast90Days / 3),
  );
  const commitsLast365DaysThreshold = criteria.commitsLast90Days * 4;

  const weightedCommitActivityRatio =
    0.45 * (commitsLast30Days / commitsLast30DaysThreshold) +
    0.35 * (input.commitsLast90Days / criteria.commitsLast90Days) +
    0.2 * (commitsLast365Days / commitsLast365DaysThreshold);

  return (
    input.commitsLast90Days >= criteria.commitsLast90Days ||
    weightedCommitActivityRatio >= 1 ||
    input.mergedPrsLast90Days >= criteria.mergedPrsLast90Days ||
    input.issuesCreatedLastYear >= criteria.issuesCreatedLastYear ||
    input.openPrsCount >= criteria.openPrsCount
  );
}

export function determineExpectedActivityTier(
  input: ScoringInput,
  profile: ScoringProfile,
): ExpectedActivityTier {
  if (meetsAny(input, profile.expectedActivityCriteria.high)) {
    return "high";
  }

  if (meetsAny(input, profile.expectedActivityCriteria.medium)) {
    return "medium";
  }

  return "low";
}
