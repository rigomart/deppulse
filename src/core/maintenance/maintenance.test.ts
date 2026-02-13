import { describe, expect, it } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import {
  calculateMaintenanceScore,
  computeScoreFromMetrics,
  MAINTENANCE_CATEGORY_INFO,
  type MaintenanceCategory,
  type MaintenanceInput,
} from "./maintenance";

const NOW = new Date("2026-02-13T00:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
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
    const snapshot: MetricsSnapshot = {
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
    };

    const result = computeScoreFromMetrics(snapshot, { now: NOW });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.category).toBeDefined();
    expect(result.breakdown.expectedActivityTier).toBe("medium");
  });

  it("penalizes stale high-expected repositories like ts-rest", () => {
    const tsRestStyle = calculateMaintenanceScore(
      makeInput({
        lastCommitAt: daysAgo(256),
        lastMergedPrAt: null,
        lastReleaseAt: daysAgo(346),
        openIssuesPercent: 29.3,
        medianIssueResolutionDays: 20,
        stars: 3_246,
        repositoryCreatedAt: new Date("2022-07-23"),
        releasesLastYear: 7,
        commitsLast90Days: 0,
        mergedPrsLast90Days: 0,
        issuesCreatedLastYear: 22,
        openPrsCount: 7,
      }),
      { now: NOW },
    );

    expect(tsRestStyle.breakdown.expectedActivityTier).toBe("high");
    expect(tsRestStyle.score).toBeLessThanOrEqual(35);
    expect(["declining", "inactive"]).toContain(tsRestStyle.category);
  });

  it("penalizes stale medium-expected repositories like next-international", () => {
    const nextInternationalStyle = calculateMaintenanceScore(
      makeInput({
        lastCommitAt: daysAgo(220),
        lastMergedPrAt: daysAgo(230),
        lastReleaseAt: daysAgo(250),
        stars: 1_800,
        openIssuesPercent: 12,
        medianIssueResolutionDays: 10,
        releasesLastYear: 5,
        commitsLast90Days: 0,
        mergedPrsLast90Days: 0,
        issuesCreatedLastYear: 15,
        openPrsCount: 6,
      }),
      { now: NOW },
    );

    expect(nextInternationalStyle.breakdown.expectedActivityTier).toBe(
      "medium",
    );
    expect(nextInternationalStyle.score).toBeLessThanOrEqual(35);
  });
});

describe("MAINTENANCE_CATEGORY_INFO", () => {
  it("provides info for all categories", () => {
    const categories: MaintenanceCategory[] = [
      "healthy",
      "moderate",
      "declining",
      "inactive",
    ];

    for (const category of categories) {
      expect(MAINTENANCE_CATEGORY_INFO[category]).toBeDefined();
    }
  });
});
