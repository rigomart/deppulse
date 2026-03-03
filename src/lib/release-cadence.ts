import type { ReleaseInfo } from "@/lib/domain/assessment";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compute a human-readable release cadence from an array of releases.
 * Returns null when there are fewer than 3 releases in the last year
 * (not enough data for a meaningful cadence).
 */
export function computeReleaseCadence(
  releases: readonly ReleaseInfo[],
): string | null {
  const oneYearAgo = Date.now() - 365 * DAY_MS;

  const timestamps = releases
    .map((r) => new Date(r.publishedAt).getTime())
    .filter((t) => t > oneYearAgo)
    .sort((a, b) => a - b);

  if (timestamps.length < 3) return null;

  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const days = (timestamps[i] - timestamps[i - 1]) / DAY_MS;
    if (days > 0) intervals.push(days);
  }

  if (intervals.length === 0) return null;

  const sorted = [...intervals].sort((a, b) => a - b);
  const medianDays =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return `~${formatDuration(medianDays)}`;
}

function formatDuration(days: number): string {
  if (days < 2) return "daily";
  if (days < 7) return `every ${Math.round(days)} days`;
  if (days < 14) return "weekly";
  if (days < 28) return `every ${Math.round(days / 7)} weeks`;
  if (days < 60) return "monthly";
  if (days < 335) return `every ${Math.round(days / 30)} months`;
  return "yearly";
}
