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
      commitsLastYear: 100,
      openIssuesPercent: 10,
      medianIssueResolutionDays: 5,
      issuesCreatedLastYear: 10,
      daysSinceLastRelease: 7,
      repositoryCreatedAt: yearsAgo(5),
      openPrsCount: 5,
      stars: 50000,
      forks: 5000,
    });
    expect(result.score).toBe(0);
    expect(result.category).toBe("inactive");
  });

  it("handles null values gracefully", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: null,
      commitsLastYear: 20,
      openIssuesPercent: null,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 5,
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
      commitsLastYear: 50,
      openIssuesPercent: 25,
      medianIssueResolutionDays: 7,
      issuesCreatedLastYear: 20,
      daysSinceLastRelease: 30,
      repositoryCreatedAt: yearsAgo(5),
      openPrsCount: 10,
      stars: 20000,
      forks: 3000,
      isArchived: false,
    });
    expect(result.category).toBe("healthy");
  });

  it("stable finished utility with recent activity → moderate", () => {
    // A truly stable utility with occasional maintenance activity
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 100, // Within 120 days for mature tier = full points
      commitsLastYear: 0,
      openIssuesPercent: 15,
      medianIssueResolutionDays: 30, // Issues are being resolved
      issuesCreatedLastYear: 2,
      daysSinceLastRelease: 100,
      repositoryCreatedAt: yearsAgo(6),
      openPrsCount: 5,
      stars: 12000, // Mature tier (10k+)
      forks: 500,
      isArchived: false,
    });
    expect(["moderate", "healthy"]).toContain(result.category);
  });

  it("slowing project with issues piling up → declining", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 200,
      commitsLastYear: 8, // Some activity but slowing down
      openIssuesPercent: 55,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 20,
      daysSinceLastRelease: 200,
      repositoryCreatedAt: yearsAgo(2.5),
      openPrsCount: 15,
      stars: 3000,
      forks: 200,
      isArchived: false,
    });
    expect(result.category).toBe("declining");
  });

  it("abandoned project → inactive", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 500,
      commitsLastYear: 0,
      openIssuesPercent: 70,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 3,
      daysSinceLastRelease: 600,
      repositoryCreatedAt: yearsAgo(4),
      openPrsCount: 20,
      stars: 5000,
      forks: 500,
      isArchived: false,
    });
    expect(result.category).toBe("inactive");
  });
});

describe("real-world reference projects", () => {
  it("axios (actively maintained) → healthy", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 5,
      commitsLastYear: 30,
      openIssuesPercent: 35,
      medianIssueResolutionDays: 14,
      issuesCreatedLastYear: 50,
      daysSinceLastRelease: 30,
      repositoryCreatedAt: yearsAgo(10),
      openPrsCount: 20,
      stars: 108000,
      forks: 11500,
      isArchived: false,
    });
    expect(result.category).toBe("healthy");
  });

  it("clsx (stable utility, 621 days inactive) → declining or inactive", () => {
    // clsx is a stable utility but with 621 days of no activity and no
    // issue resolution, it scores lower under the new system. Users can
    // see the metrics and decide - the tool surfaces the data honestly.
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 621,
      commitsLastYear: 0,
      openIssuesPercent: 13,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 2,
      daysSinceLastRelease: 621,
      repositoryCreatedAt: new Date("2018-12-24"),
      openPrsCount: 6,
      stars: 9600,
      forks: 162,
      isArchived: false,
    });
    expect(["declining", "inactive"]).toContain(result.category);
  });

  it("stitches (no activity) → inactive", () => {
    // Real stitches data as of Jan 2026:
    // - 930 days since commit (2.5+ years)
    // - 1350 days since release (3.7+ years)
    // - No issues closed recently
    // With activity-heavy weights (70%) and no free points for null values,
    // zero activity results in inactive classification.
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 930,
      commitsLastYear: 0,
      openIssuesPercent: 16.9,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 0,
      daysSinceLastRelease: 1350,
      repositoryCreatedAt: new Date("2020-04-14"),
      openPrsCount: 8,
      stars: 7805,
      forks: 261,
      isArchived: false,
    });
    expect(result.category).toBe("inactive");
  });

  it("ts-rest (slowing down, high open issues) → declining", () => {
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 210,
      commitsLastYear: 10, // Some activity but slowing down
      openIssuesPercent: 55,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 20,
      daysSinceLastRelease: 210,
      repositoryCreatedAt: yearsAgo(2.5),
      openPrsCount: 15,
      stars: 3212,
      forks: 174,
      isArchived: false,
    });
    expect(result.category).toBe("declining");
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
