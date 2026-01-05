import { describe, expect, it } from "vitest";
import {
  calculateMaintenanceScore,
  determineMaturityTier,
  MAINTENANCE_CATEGORY_INFO,
  type MaintenanceCategory,
} from "./maintenance";

function yearsAgo(years: number): Date {
  return new Date(Date.now() - years * 365 * 24 * 60 * 60 * 1000);
}

describe("maturity tier classification", () => {
  it("classifies by age and popularity thresholds", () => {
    expect(determineMaturityTier(yearsAgo(1), 500, 50)).toBe("emerging");
    expect(determineMaturityTier(yearsAgo(3), 500, 50)).toBe("growing");
    expect(determineMaturityTier(yearsAgo(1), 2000, 100)).toBe("growing");
    expect(determineMaturityTier(yearsAgo(6), 500, 50)).toBe("mature");
    expect(determineMaturityTier(yearsAgo(2), 15000, 2000)).toBe("mature");
  });
});

describe("special cases", () => {
  it("archived repository always scores 0", () => {
    const result = calculateMaintenanceScore({
      isArchived: true,
      daysSinceLastCommit: 1,
      commitsLast90Days: 100,
      openIssuesPercent: 10,
      medianIssueResolutionDays: 5,
      issuesCreatedLast90Days: 10,
      daysSinceLastRelease: 7,
      repositoryCreatedAt: yearsAgo(5),
      openPrsCount: 5,
      stars: 50000,
      forks: 5000,
    });
    expect(result.score).toBe(0);
    expect(result.category).toBe("unmaintained");
  });

  it("handles null values gracefully", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: null,
      commitsLast90Days: 20,
      openIssuesPercent: null,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 5,
      daysSinceLastRelease: null,
      repositoryCreatedAt: null,
      openPrsCount: 5,
      stars: 1000,
      forks: 100,
      isArchived: false,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.maturityTier).toBe("growing"); // null age defaults to growing
  });
});

describe("scenario-based scoring", () => {
  it("actively maintained project → healthy", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 5,
      commitsLast90Days: 50,
      openIssuesPercent: 25,
      medianIssueResolutionDays: 7,
      issuesCreatedLast90Days: 20,
      daysSinceLastRelease: 30,
      repositoryCreatedAt: yearsAgo(5),
      openPrsCount: 10,
      stars: 20000,
      forks: 3000,
      isArchived: false,
    });
    expect(result.category).toBe("healthy");
  });

  it("stable finished utility → moderate", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 400,
      commitsLast90Days: 0,
      openIssuesPercent: 15,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 2,
      daysSinceLastRelease: 400,
      repositoryCreatedAt: yearsAgo(6),
      openPrsCount: 5,
      stars: 8000,
      forks: 500,
      isArchived: false,
    });
    expect(["moderate", "healthy"]).toContain(result.category);
  });

  it("slowing project with issues piling up → at-risk", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 200,
      commitsLast90Days: 2,
      openIssuesPercent: 55,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 5,
      daysSinceLastRelease: 200,
      repositoryCreatedAt: yearsAgo(2.5),
      openPrsCount: 15,
      stars: 3000,
      forks: 200,
      isArchived: false,
    });
    expect(result.category).toBe("at-risk");
  });

  it("abandoned project with high open issues → unmaintained", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 500,
      commitsLast90Days: 0,
      openIssuesPercent: 70,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 3,
      daysSinceLastRelease: 600,
      repositoryCreatedAt: yearsAgo(4),
      openPrsCount: 20,
      stars: 5000,
      forks: 500,
      isArchived: false,
    });
    expect(result.category).toBe("unmaintained");
  });
});

describe("real-world reference projects", () => {
  it("axios (actively maintained) → healthy", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 5,
      commitsLast90Days: 30,
      openIssuesPercent: 35,
      medianIssueResolutionDays: 14,
      issuesCreatedLast90Days: 50,
      daysSinceLastRelease: 30,
      repositoryCreatedAt: yearsAgo(10),
      openPrsCount: 20,
      stars: 108000,
      forks: 11500,
      isArchived: false,
    });
    expect(result.category).toBe("healthy");
  });

  it("clsx (stable utility, 621 days inactive) → moderate", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 621,
      commitsLast90Days: 0,
      openIssuesPercent: 13,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 2,
      daysSinceLastRelease: 621,
      repositoryCreatedAt: new Date("2018-12-24"),
      openPrsCount: 6,
      stars: 9600,
      forks: 162,
      isArchived: false,
    });
    expect(["moderate", "healthy"]).toContain(result.category);
  });

  it("stitches (no activity, low open issues %) → at-risk", () => {
    // Real stitches data as of Jan 2026:
    // - 930 days since commit (2.5+ years)
    // - 1350 days since release (3.7+ years)
    // - 0 issues created
    // - 16.9% open issues
    // With activity-heavy weights, zero activity pulls score down to at-risk
    // despite "good" issue metrics. Users see the metrics and decide.
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 930,
      commitsLast90Days: 0,
      openIssuesPercent: 16.9,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 0,
      daysSinceLastRelease: 1350,
      repositoryCreatedAt: new Date("2020-04-14"),
      openPrsCount: 8,
      stars: 7805,
      forks: 261,
      isArchived: false,
    });
    expect(result.category).toBe("at-risk");
  });

  it("ts-rest (slowing down, high open issues) → at-risk", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 210,
      commitsLast90Days: 2,
      openIssuesPercent: 55,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 5,
      daysSinceLastRelease: 210,
      repositoryCreatedAt: yearsAgo(2.5),
      openPrsCount: 15,
      stars: 3212,
      forks: 174,
      isArchived: false,
    });
    expect(result.category).toBe("at-risk");
  });
});

describe("MAINTENANCE_CATEGORY_INFO", () => {
  it("provides info for all categories", () => {
    const categories: MaintenanceCategory[] = [
      "healthy",
      "moderate",
      "at-risk",
      "unmaintained",
    ];
    for (const category of categories) {
      expect(MAINTENANCE_CATEGORY_INFO[category]).toBeDefined();
    }
  });
});
