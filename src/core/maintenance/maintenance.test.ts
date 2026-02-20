import { describe, expect, it } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import {
  calculateMaintenanceScore,
  computeScoreFromMetrics,
  type MaintenanceInput,
} from "./maintenance";

const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function yearsAgo(years: number): Date {
  const date = new Date(NOW);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

function makeSnapshot(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    description: "repo",
    stars: 700,
    forks: 100,
    avatarUrl: "https://example.com/avatar.png",
    htmlUrl: "https://github.com/acme/repo",
    license: "MIT",
    language: "TypeScript",
    repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
    isArchived: false,
    lastCommitAt: "2025-12-10T00:00:00.000Z",
    lastReleaseAt: "2025-11-10T00:00:00.000Z",
    lastClosedIssueAt: "2026-01-01T00:00:00.000Z",
    lastMergedPrAt: "2025-12-15T00:00:00.000Z",
    openIssuesPercent: 20,
    openIssuesCount: 20,
    closedIssuesCount: 80,
    medianIssueResolutionDays: 9,
    openPrsCount: 5,
    issuesCreatedLastYear: 14,
    commitsLast90Days: 4,
    mergedPrsLast90Days: 2,
    releases: [
      {
        tagName: "v1.4.0",
        name: "v1.4.0",
        publishedAt: "2025-11-10T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<MaintenanceInput> = {},
): MaintenanceInput {
  return {
    lastCommitAt: daysAgo(3),
    lastMergedPrAt: daysAgo(5),
    lastReleaseAt: daysAgo(14),
    openIssuesPercent: 8,
    medianIssueResolutionDays: 7,
    stars: 5_000,
    repositoryCreatedAt: new Date("2020-01-01T00:00:00.000Z"),
    releasesLastYear: 7,
    commitsLast90Days: 15,
    mergedPrsLast90Days: 8,
    issuesCreatedLastYear: 40,
    openPrsCount: 10,
    isArchived: false,
    ...overrides,
  };
}

describe("maintenance scoring", () => {
  it("returns score, category, and breakdown", () => {
    const result = calculateMaintenanceScore(makeInput(), { now: NOW });

    expect(result.score).toBeGreaterThan(0);
    expect(result.category).toBeDefined();
    expect(result.breakdown.quality).toBeGreaterThan(0);
    expect(result.breakdown.freshnessMultiplier).toBeGreaterThan(0);
  });

  it("scores from metrics snapshot using required recent counters", () => {
    const result = computeScoreFromMetrics(makeSnapshot(), { now: NOW });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.category).toBeDefined();
    expect(result.breakdown.expectedActivityTier).toBe("medium");
  });

  it("throws when required expected-activity counters are missing", () => {
    const missingIssuesCreated = {
      ...makeSnapshot(),
      issuesCreatedLastYear: undefined,
    } as unknown as MetricsSnapshot;
    expect(() => computeScoreFromMetrics(missingIssuesCreated, { now: NOW })).toThrow(
      "issuesCreatedLastYear",
    );

    const missingOpenPrs = {
      ...makeSnapshot(),
      openPrsCount: undefined,
    } as unknown as MetricsSnapshot;
    expect(() => computeScoreFromMetrics(missingOpenPrs, { now: NOW })).toThrow(
      "openPrsCount",
    );
  });

  it("penalizes stale medium-expected repositories compared to fresh ones", () => {
    const fresh = calculateMaintenanceScore(
      makeInput({
        lastCommitAt: daysAgo(10),
        lastMergedPrAt: daysAgo(20),
        lastReleaseAt: daysAgo(30),
        openIssuesPercent: 29.3,
        medianIssueResolutionDays: 20,
        stars: 3_246,
        repositoryCreatedAt: yearsAgo(3),
        releasesLastYear: 7,
        commitsLast90Days: 4,
        mergedPrsLast90Days: 2,
        issuesCreatedLastYear: 22,
        openPrsCount: 7,
      }),
      { now: NOW },
    );

    const stale = calculateMaintenanceScore(
      makeInput({
        lastCommitAt: daysAgo(220),
        lastMergedPrAt: daysAgo(230),
        lastReleaseAt: daysAgo(250),
        openIssuesPercent: 29.3,
        medianIssueResolutionDays: 20,
        stars: 3_246,
        repositoryCreatedAt: yearsAgo(3),
        releasesLastYear: 7,
        commitsLast90Days: 0,
        mergedPrsLast90Days: 0,
        issuesCreatedLastYear: 22,
        openPrsCount: 7,
      }),
      { now: NOW },
    );

    expect(fresh.breakdown.expectedActivityTier).toBe("medium");
    expect(stale.breakdown.expectedActivityTier).toBe("medium");
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("penalizes irregular release cadence when release count is equal", () => {
    const regular = calculateMaintenanceScore(
      makeInput({
        releasesLastYear: 4,
        releaseRegularity: 1,
      }),
      { now: NOW },
    );

    const irregular = calculateMaintenanceScore(
      makeInput({
        releasesLastYear: 4,
        releaseRegularity: 0.25,
      }),
      { now: NOW },
    );

    expect(irregular.score).toBeLessThan(regular.score);
  });
});
