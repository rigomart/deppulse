import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import {
  calculateMaintenanceScore,
  computeScoreFromMetrics,
  type MaintenanceInput,
} from "./maintenance";

const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function yearsAgo(years: number): Date {
  const date = new Date(NOW);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

const defaultMaintenanceInput: MaintenanceInput = {
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
};

function makeInput(
  overrides: Partial<MaintenanceInput> = {},
): MaintenanceInput {
  return { ...defaultMaintenanceInput, ...overrides };
}

function makeSnapshot(
  overrides: Partial<MetricsSnapshot> = {},
): MetricsSnapshot {
  return {
    description: "repo",
    stars: 700,
    forks: 100,
    avatarUrl: "",
    htmlUrl: "",
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

describe("calculateMaintenanceScore", () => {
  it("rewards an active, healthy project", () => {
    const result = calculateMaintenanceScore(makeInput());

    expect(result.score).toBeGreaterThan(0);
    expect(result.breakdown.quality).toBeGreaterThan(0);
    expect(result.breakdown.freshnessMultiplier).toBeGreaterThan(0);
  });

  it("scores stale repositories lower than fresh ones", () => {
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
    );

    expect(fresh.breakdown.expectedActivityTier).toBe("medium");
    expect(stale.breakdown.expectedActivityTier).toBe("medium");
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("scores irregular release cadence lower than regular", () => {
    const regular = calculateMaintenanceScore(
      makeInput({ releasesLastYear: 4, releaseRegularity: 1 }),
    );

    const irregular = calculateMaintenanceScore(
      makeInput({ releasesLastYear: 4, releaseRegularity: 0.25 }),
    );

    expect(irregular.score).toBeLessThan(regular.score);
  });
});

describe("computeScoreFromMetrics", () => {
  it("scores a project from stored metrics", () => {
    const result = computeScoreFromMetrics(makeSnapshot());

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.category).toBeDefined();
    expect(result.breakdown.expectedActivityTier).toBe("medium");
  });

  it("handles missing activity dates and empty releases", () => {
    const result = computeScoreFromMetrics(
      makeSnapshot({
        lastCommitAt: null,
        lastMergedPrAt: null,
        lastReleaseAt: null,
        repositoryCreatedAt: null,
        releases: [],
      }),
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.category).toBeDefined();
  });
});
