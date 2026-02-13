import { describe, expect, it } from "vitest";
import { STRICT_BALANCED_PROFILE } from "./profiles";
import { computeQualityScore } from "./quality";
import type { ScoringInput } from "./types";

const NOW = new Date("2026-02-13T00:00:00.000Z");

function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    lastCommitAt: new Date("2026-02-12T00:00:00.000Z"),
    lastMergedPrAt: new Date("2026-02-12T00:00:00.000Z"),
    lastReleaseAt: new Date("2026-01-01T00:00:00.000Z"),
    openIssuesPercent: 5,
    medianIssueResolutionDays: 5,
    stars: 40_000,
    repositoryCreatedAt: new Date("2018-01-01T00:00:00.000Z"),
    releasesLastYear: 10,
    commitsLast90Days: 20,
    mergedPrsLast90Days: 10,
    issuesCreatedLastYear: 60,
    openPrsCount: 20,
    isArchived: false,
    ...overrides,
  };
}

describe("quality scoring", () => {
  it("returns high quality for strong repositories", () => {
    const result = computeQualityScore(
      makeInput(),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    expect(result.quality).toBeGreaterThanOrEqual(95);
    expect(result.signals.issueHealth).toBe(1);
    expect(result.signals.releaseHealth).toBe(1);
  });

  it("penalizes missing issue resolution when open issues exist", () => {
    const withOpenIssues = computeQualityScore(
      makeInput({ medianIssueResolutionDays: null, openIssuesPercent: 20 }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    const withoutOpenIssues = computeQualityScore(
      makeInput({ medianIssueResolutionDays: null, openIssuesPercent: 0 }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    expect(withoutOpenIssues.quality).toBeGreaterThan(withOpenIssues.quality);
  });

  it("normalizes weights even when totals are not 1", () => {
    const profileA = {
      ...STRICT_BALANCED_PROFILE,
      qualityWeights: {
        issueHealth: 30,
        releaseHealth: 25,
        community: 15,
        maturity: 10,
        activityBreadth: 20,
      },
    };

    const profileB = {
      ...STRICT_BALANCED_PROFILE,
      qualityWeights: {
        issueHealth: 300,
        releaseHealth: 250,
        community: 150,
        maturity: 100,
        activityBreadth: 200,
      },
    };

    const a = computeQualityScore(makeInput(), profileA, NOW);
    const b = computeQualityScore(makeInput(), profileB, NOW);

    expect(a.quality).toBe(b.quality);
  });
});
