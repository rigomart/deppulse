import { describe, expect, it } from "vitest";
import {
  calculateMaintenanceScore,
  computeEngagementFactor,
  computeQualityScore,
  MAINTENANCE_CATEGORY_INFO,
  type MaintenanceCategory,
  type MaintenanceInput,
} from "./maintenance";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Real-world project fixtures (data from GitHub GraphQL API, Feb 2026)
// ---------------------------------------------------------------------------

const NEXT_JS: MaintenanceInput = {
  lastCommitAt: daysAgo(0),
  lastMergedPrAt: daysAgo(0),
  lastReleaseAt: daysAgo(0),
  openIssuesPercent: 8.4,
  medianIssueResolutionDays: 5,
  stars: 137647,
  repositoryCreatedAt: new Date("2016-10-05"),
  releasesLastYear: 20,
  isArchived: false,
};

const REACT: MaintenanceInput = {
  lastCommitAt: daysAgo(1),
  lastMergedPrAt: daysAgo(1),
  lastReleaseAt: daysAgo(18),
  openIssuesPercent: 5.7,
  medianIssueResolutionDays: 7,
  stars: 242982,
  repositoryCreatedAt: new Date("2013-05-24"),
  releasesLastYear: 15,
  isArchived: false,
};

const EXPRESS: MaintenanceInput = {
  lastCommitAt: daysAgo(4),
  lastMergedPrAt: daysAgo(4),
  lastReleaseAt: daysAgo(74),
  openIssuesPercent: 2.5,
  medianIssueResolutionDays: 14,
  stars: 68689,
  repositoryCreatedAt: new Date("2009-06-26"),
  releasesLastYear: 4,
  isArchived: false,
};

const DATE_FNS: MaintenanceInput = {
  lastCommitAt: daysAgo(158),
  lastMergedPrAt: daysAgo(1538),
  lastReleaseAt: daysAgo(515),
  openIssuesPercent: 32.2,
  medianIssueResolutionDays: null,
  stars: 36467,
  repositoryCreatedAt: new Date("2014-10-06"),
  releasesLastYear: 0,
  isArchived: false,
};

const TS_REST: MaintenanceInput = {
  lastCommitAt: daysAgo(256),
  lastMergedPrAt: null,
  lastReleaseAt: daysAgo(346),
  openIssuesPercent: 29.3,
  medianIssueResolutionDays: 20,
  stars: 3246,
  repositoryCreatedAt: new Date("2022-07-23"),
  releasesLastYear: 7,
  isArchived: false,
};

const CLSX: MaintenanceInput = {
  lastCommitAt: daysAgo(662),
  lastMergedPrAt: daysAgo(662),
  lastReleaseAt: daysAgo(662),
  openIssuesPercent: 13.1,
  medianIssueResolutionDays: null,
  stars: 9677,
  repositoryCreatedAt: new Date("2018-12-24"),
  releasesLastYear: 0,
  isArchived: false,
};

const STITCHES: MaintenanceInput = {
  lastCommitAt: daysAgo(970),
  lastMergedPrAt: daysAgo(1226),
  lastReleaseAt: daysAgo(1390),
  openIssuesPercent: 16.9,
  medianIssueResolutionDays: null,
  stars: 7804,
  repositoryCreatedAt: new Date("2020-04-14"),
  releasesLastYear: 0,
  isArchived: false,
};

// ---------------------------------------------------------------------------
// Engagement factor tests
// ---------------------------------------------------------------------------

describe("engagement factor", () => {
  it("returns 1.0 for activity within 90 days", () => {
    expect(computeEngagementFactor(NEXT_JS)).toBe(1.0);
    expect(computeEngagementFactor(REACT)).toBe(1.0);
    expect(computeEngagementFactor(EXPRESS)).toBe(1.0);
  });

  it("returns 0.8 for activity within 180 days", () => {
    expect(computeEngagementFactor(DATE_FNS)).toBe(0.8);
  });

  it("returns 0.5 for activity within 365 days", () => {
    expect(computeEngagementFactor(TS_REST)).toBe(0.5);
  });

  it("returns 0.2 for activity within 730 days", () => {
    expect(computeEngagementFactor(CLSX)).toBe(0.2);
  });

  it("returns 0.1 for very old activity", () => {
    expect(computeEngagementFactor(STITCHES)).toBe(0.1);
  });

  it("returns 0.1 when all signals are null", () => {
    const noData: MaintenanceInput = {
      lastCommitAt: null,
      lastMergedPrAt: null,
      lastReleaseAt: null,
      openIssuesPercent: null,
      medianIssueResolutionDays: null,
      stars: 100,
      repositoryCreatedAt: null,
      releasesLastYear: 0,
      isArchived: false,
    };
    expect(computeEngagementFactor(noData)).toBe(0.1);
  });
});

// ---------------------------------------------------------------------------
// Quality score tests
// ---------------------------------------------------------------------------

describe("quality score", () => {
  it("maxes out for top-tier projects", () => {
    expect(computeQualityScore(NEXT_JS)).toBe(100);
    expect(computeQualityScore(REACT)).toBe(100);
  });

  it("scores high for well-maintained projects", () => {
    const expressQuality = computeQualityScore(EXPRESS);
    expect(expressQuality).toBeGreaterThanOrEqual(85);
  });

  it("penalizes lack of releases and null resolution with open issues", () => {
    const dateFnsQuality = computeQualityScore(DATE_FNS);
    // date-fns: 0 releases, null resolution with 32% open issues → lower quality
    expect(dateFnsQuality).toBeLessThan(50);
  });

  it("penalizes zero activity breadth", () => {
    const stitchesQuality = computeQualityScore(STITCHES);
    // stitches: 0 channels active in last year → loses breadth points
    expect(stitchesQuality).toBeLessThan(45);
  });
});

// ---------------------------------------------------------------------------
// Special cases
// ---------------------------------------------------------------------------

describe("special cases", () => {
  it("archived repository always scores 0", () => {
    const result = calculateMaintenanceScore({
      ...NEXT_JS,
      isArchived: true,
    });
    expect(result.score).toBe(0);
    expect(result.category).toBe("inactive");
  });

  it("handles all-null input gracefully", () => {
    const result = calculateMaintenanceScore({
      lastCommitAt: null,
      lastMergedPrAt: null,
      lastReleaseAt: null,
      openIssuesPercent: null,
      medianIssueResolutionDays: null,
      stars: 0,
      repositoryCreatedAt: null,
      releasesLastYear: 0,
      isArchived: false,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.category).toBe("inactive");
  });

  it("null resolution speed gives 0 pts when open issues exist", () => {
    const withOpenIssues = computeQualityScore({
      ...NEXT_JS,
      medianIssueResolutionDays: null,
      openIssuesPercent: 10, // still in "excellent" ratio bucket (≤20)
    });
    const withoutOpenIssues = computeQualityScore({
      ...NEXT_JS,
      medianIssueResolutionDays: null,
      openIssuesPercent: 0,
    });
    // Both in same ratio bucket, so difference is purely from resolution:
    // null + open issues = 0 pts, null + no open issues = round(15 * 0.5) = 8 pts
    expect(withoutOpenIssues - withOpenIssues).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Real-world scoring (engagement × quality → category)
// ---------------------------------------------------------------------------

describe("real-world projects (data from GitHub API, Feb 2026)", () => {
  it("next.js (actively developed framework) → healthy", () => {
    const result = calculateMaintenanceScore(NEXT_JS);
    expect(result.category).toBe("healthy");
    expect(result.score).toBe(100);
  });

  it("react (actively developed library) → healthy", () => {
    const result = calculateMaintenanceScore(REACT);
    expect(result.category).toBe("healthy");
    expect(result.score).toBe(100);
  });

  it("express (established framework) → healthy", () => {
    const result = calculateMaintenanceScore(EXPRESS);
    expect(result.category).toBe("healthy");
    expect(result.score).toBe(91);
  });

  it("date-fns (no recent releases, stale PRs) → declining", () => {
    const result = calculateMaintenanceScore(DATE_FNS);
    expect(result.category).toBe("declining");
    expect(result.score).toBe(34);
  });

  it("ts-rest (255+ days since activity, no merged PRs) → declining", () => {
    const result = calculateMaintenanceScore(TS_REST);
    expect(result.category).toBe("declining");
    expect(result.score).toBe(39);
  });

  it("clsx (662 days since activity, no releases) → inactive", () => {
    const result = calculateMaintenanceScore(CLSX);
    expect(result.category).toBe("inactive");
    expect(result.score).toBe(8);
  });

  it("stitches (abandoned CSS-in-JS library) → inactive", () => {
    const result = calculateMaintenanceScore(STITCHES);
    expect(result.category).toBe("inactive");
    expect(result.score).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Category info
// ---------------------------------------------------------------------------

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
