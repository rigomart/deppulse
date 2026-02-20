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

  it("scores quarterly release cadence as excellent", () => {
    const result = computeQualityScore(
      makeInput({ releasesLastYear: 4 }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    expect(result.signals.releaseHealth).toBe(1);
  });

  it("penalizes stale release recency even when yearly cadence is strong", () => {
    const recentRelease = computeQualityScore(
      makeInput({
        releasesLastYear: 4,
        lastReleaseAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    const staleRelease = computeQualityScore(
      makeInput({
        releasesLastYear: 4,
        lastReleaseAt: new Date("2024-12-01T00:00:00.000Z"),
      }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    expect(staleRelease.signals.releaseHealth).toBeLessThan(
      recentRelease.signals.releaseHealth,
    );
  });

  it("penalizes irregular release spacing when cadence count is the same", () => {
    const regularReleases = computeQualityScore(
      makeInput({
        releasesLastYear: 4,
        releaseRegularity: 1,
      }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    const irregularReleases = computeQualityScore(
      makeInput({
        releasesLastYear: 4,
        releaseRegularity: 0.25,
      }),
      STRICT_BALANCED_PROFILE,
      NOW,
    );

    expect(irregularReleases.signals.releaseHealth).toBeLessThan(
      regularReleases.signals.releaseHealth,
    );
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

  it("keeps boundary transitions smooth across interpolated signals", () => {
    const boundaryPairs: Array<{
      lower: Partial<ScoringInput>;
      higher: Partial<ScoringInput>;
    }> = [
      { lower: { stars: 4_999 }, higher: { stars: 5_000 } },
      {
        lower: { medianIssueResolutionDays: 14 },
        higher: { medianIssueResolutionDays: 15 },
      },
      {
        lower: { openIssuesPercent: 40 },
        higher: { openIssuesPercent: 41 },
      },
    ];

    for (const boundary of boundaryPairs) {
      const lower = computeQualityScore(
        makeInput(boundary.lower),
        STRICT_BALANCED_PROFILE,
        NOW,
      );
      const higher = computeQualityScore(
        makeInput(boundary.higher),
        STRICT_BALANCED_PROFILE,
        NOW,
      );

      expect(Math.abs(higher.quality - lower.quality)).toBeLessThanOrEqual(1);
    }
  });
});
