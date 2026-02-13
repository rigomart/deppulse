import { describe, expect, it } from "vitest";
import { calculateScore } from "./engine";
import type { ScoringInput } from "./types";

const NOW = new Date("2026-02-13T00:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    lastCommitAt: daysAgo(3),
    lastMergedPrAt: daysAgo(4),
    lastReleaseAt: daysAgo(10),
    openIssuesPercent: 5,
    medianIssueResolutionDays: 7,
    stars: 10_000,
    repositoryCreatedAt: new Date("2018-01-01T00:00:00.000Z"),
    releasesLastYear: 8,
    commitsLast90Days: 20,
    mergedPrsLast90Days: 10,
    issuesCreatedLastYear: 50,
    openPrsCount: 15,
    isArchived: false,
    ...overrides,
  };
}

describe("scoring engine", () => {
  it("severely penalizes high-expected repos stale for more than 180 days", () => {
    const result = calculateScore(
      makeInput({
        lastCommitAt: daysAgo(220),
        lastMergedPrAt: daysAgo(250),
        lastReleaseAt: daysAgo(260),
      }),
      { now: NOW },
    );

    expect(result.breakdown.expectedActivityTier).toBe("high");
    expect(result.breakdown.daysSinceMostRecentActivity).toBe(220);
    expect(result.score).toBeLessThanOrEqual(35);
  });

  it("severely penalizes high-expected repos stale for more than 365 days", () => {
    const result = calculateScore(
      makeInput({
        lastCommitAt: daysAgo(420),
        lastMergedPrAt: daysAgo(460),
        lastReleaseAt: daysAgo(500),
      }),
      { now: NOW },
    );

    expect(result.breakdown.expectedActivityTier).toBe("high");
    expect(result.breakdown.daysSinceMostRecentActivity).toBe(420);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it("applies strongest inactivity multiplier to popular but stale repositories", () => {
    const result = calculateScore(
      makeInput({
        lastCommitAt: daysAgo(420),
        lastMergedPrAt: null,
        lastReleaseAt: null,
        stars: 3_000,
        commitsLast90Days: 0,
        mergedPrsLast90Days: 0,
        issuesCreatedLastYear: 0,
        openPrsCount: 0,
      }),
      { now: NOW },
    );

    expect(result.breakdown.expectedActivityTier).toBe("high");
    expect(result.breakdown.freshnessMultiplier).toBe(0.05);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it("allows low-expected stable utilities to stay moderate at similar inactivity", () => {
    const result = calculateScore(
      makeInput({
        lastCommitAt: daysAgo(300),
        lastMergedPrAt: daysAgo(320),
        lastReleaseAt: daysAgo(340),
        stars: 499,
        commitsLast90Days: 0,
        mergedPrsLast90Days: 0,
        issuesCreatedLastYear: 2,
        openPrsCount: 1,
      }),
      { now: NOW },
    );

    expect(result.breakdown.expectedActivityTier).toBe("low");
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.category).toBe("moderate");
  });

  it("returns zero for archived repositories", () => {
    const result = calculateScore(makeInput({ isArchived: true }), {
      now: NOW,
    });

    expect(result.score).toBe(0);
    expect(result.category).toBe("inactive");
  });

  it("is deterministic when now is injected", () => {
    const input = makeInput({
      lastCommitAt: new Date("2025-06-01T00:00:00.000Z"),
      lastMergedPrAt: new Date("2025-06-02T00:00:00.000Z"),
      lastReleaseAt: new Date("2025-06-03T00:00:00.000Z"),
    });

    const first = calculateScore(input, { now: NOW });
    const second = calculateScore(input, { now: NOW });

    expect(first).toEqual(second);
  });
});
