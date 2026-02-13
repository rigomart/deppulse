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
  return (
    input.commitsLast90Days >= criteria.commitsLast90Days ||
    input.mergedPrsLast90Days >= criteria.mergedPrsLast90Days ||
    input.issuesCreatedLastYear >= criteria.issuesCreatedLastYear ||
    input.openPrsCount >= criteria.openPrsCount ||
    input.stars >= criteria.stars
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
