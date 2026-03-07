import { differenceInDays } from "date-fns";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import type { DimensionResult } from "./types";

export function rateReleaseCadence(
  metrics: MetricsSnapshot,
  analysisTime: Date,
): DimensionResult {
  const releases = metrics.releases;
  const repoCreatedAt = metrics.repositoryCreatedAt
    ? new Date(metrics.repositoryCreatedAt)
    : null;

  const repoAgeYears = repoCreatedAt
    ? differenceInDays(analysisTime, repoCreatedAt) / 365
    : null;

  const lastRelease =
    releases.length > 0
      ? releases.reduce((latest, r) =>
          new Date(r.publishedAt) > new Date(latest.publishedAt) ? r : latest,
        )
      : null;

  const daysSinceLastRelease = lastRelease
    ? differenceInDays(analysisTime, new Date(lastRelease.publishedAt))
    : null;

  // Count releases in the last 365 days
  const cutoff = new Date(analysisTime.getTime() - 365 * 86_400_000);
  const releasesLastYear = releases.filter(
    (r) => new Date(r.publishedAt) >= cutoff,
  ).length;

  const inputs: DimensionResult["inputs"] = {
    totalReleases: releases.length,
    releasesLastYear,
    daysSinceLastRelease,
    repoAgeYears:
      repoAgeYears !== null ? Math.round(repoAgeYears * 10) / 10 : null,
  };

  // No releases ever, but repo is young — no signal yet
  if (releases.length === 0 && repoAgeYears !== null && repoAgeYears < 1) {
    return { dimension: "release-cadence", level: "adequate", inputs };
  }

  // No releases on a mature repo, or last release over 2 years ago
  const isInactive =
    (releases.length === 0 && repoAgeYears !== null && repoAgeYears >= 1) ||
    (daysSinceLastRelease !== null && daysSinceLastRelease > 730);

  if (isInactive) {
    return { dimension: "release-cadence", level: "inactive", inputs };
  }

  const isStrong =
    releasesLastYear >= 4 &&
    daysSinceLastRelease !== null &&
    daysSinceLastRelease <= 90;

  const isAdequate =
    releasesLastYear >= 1 ||
    (daysSinceLastRelease !== null && daysSinceLastRelease <= 180);

  const level = isStrong ? "strong" : isAdequate ? "adequate" : "weak";

  return { dimension: "release-cadence", level, inputs };
}
