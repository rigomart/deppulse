import { describe, expect, it } from "vitest";
import { STRICT_BALANCED_PROFILE } from "./profiles";
import {
  determineExpectedActivityTier,
  getDaysSinceMostRecentActivity,
  getMostRecentActivityDate,
} from "./signals";
import type { ScoringInput } from "./types";

const NOW = new Date("2026-02-13T00:00:00.000Z");

function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    lastCommitAt: new Date("2026-02-10T00:00:00.000Z"),
    lastMergedPrAt: new Date("2026-02-09T00:00:00.000Z"),
    lastReleaseAt: new Date("2026-01-15T00:00:00.000Z"),
    openIssuesPercent: 20,
    medianIssueResolutionDays: 7,
    stars: 200,
    repositoryCreatedAt: new Date("2020-01-01T00:00:00.000Z"),
    releasesLastYear: 6,
    commitsLast90Days: 1,
    mergedPrsLast90Days: 1,
    issuesCreatedLastYear: 1,
    openPrsCount: 1,
    isArchived: false,
    ...overrides,
  };
}

describe("scoring signals", () => {
  it("uses the most recent activity date across channels", () => {
    const input = makeInput({
      lastCommitAt: new Date("2025-12-01T00:00:00.000Z"),
      lastMergedPrAt: new Date("2026-02-01T00:00:00.000Z"),
      lastReleaseAt: new Date("2026-01-20T00:00:00.000Z"),
    });

    const mostRecent = getMostRecentActivityDate(input);

    expect(mostRecent?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(getDaysSinceMostRecentActivity(input, NOW)).toBe(12);
  });

  it("returns null days when no activity dates exist", () => {
    const input = makeInput({
      lastCommitAt: null,
      lastMergedPrAt: null,
      lastReleaseAt: null,
    });

    expect(getMostRecentActivityDate(input)).toBeNull();
    expect(getDaysSinceMostRecentActivity(input, NOW)).toBeNull();
  });

  it("classifies expected activity tiers", () => {
    const high = makeInput({ commitsLast90Days: 18 });
    const medium = makeInput({
      commitsLast90Days: 4,
      mergedPrsLast90Days: 0,
      issuesCreatedLastYear: 0,
      openPrsCount: 0,
      stars: 100,
    });
    const low = makeInput({
      commitsLast90Days: 0,
      mergedPrsLast90Days: 0,
      issuesCreatedLastYear: 1,
      openPrsCount: 1,
      stars: 200,
    });

    expect(determineExpectedActivityTier(high, STRICT_BALANCED_PROFILE)).toBe(
      "high",
    );
    expect(determineExpectedActivityTier(medium, STRICT_BALANCED_PROFILE)).toBe(
      "medium",
    );
    expect(determineExpectedActivityTier(low, STRICT_BALANCED_PROFILE)).toBe(
      "low",
    );
  });

  it("classifies as high expected when stars alone meet high threshold", () => {
    const popularButQuiet = makeInput({
      stars: 3_000,
      commitsLast90Days: 0,
      mergedPrsLast90Days: 0,
      issuesCreatedLastYear: 0,
      openPrsCount: 0,
    });

    expect(
      determineExpectedActivityTier(popularButQuiet, STRICT_BALANCED_PROFILE),
    ).toBe("high");
  });
});
