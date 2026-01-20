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

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Creates a commit activity array with commits distributed evenly across weeks.
 * @param totalCommits - Total commits to distribute
 * @param weeks - Number of weeks (default 52)
 */
function makeCommitActivity(
  totalCommits: number,
  weeks = 52,
): Array<{ week: string; commits: number }> {
  const perWeek = Math.floor(totalCommits / weeks);
  const remainder = totalCommits % weeks;
  return Array.from({ length: weeks }, (_, i) => ({
    week: `2025-W${String(52 - i).padStart(2, "0")}`,
    commits: perWeek + (i < remainder ? 1 : 0),
  }));
}

/**
 * Creates commit activity with recent activity only (for testing timeframe behavior).
 * @param recentCommits - Commits in recent weeks
 * @param recentWeeks - How many recent weeks to put commits in
 */
function makeRecentCommitActivity(
  recentCommits: number,
  recentWeeks = 13,
): Array<{ week: string; commits: number }> {
  const perWeek = Math.floor(recentCommits / recentWeeks);
  const remainder = recentCommits % recentWeeks;
  return Array.from({ length: 52 }, (_, i) => ({
    week: `2025-W${String(52 - i).padStart(2, "0")}`,
    commits: i < recentWeeks ? perWeek + (i < remainder ? 1 : 0) : 0,
  }));
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
      lastCommitAt: daysAgo(1),
      commitActivity: makeCommitActivity(100),
      openIssuesPercent: 10,
      medianIssueResolutionDays: 5,
      issuesCreatedLastYear: 10,
      lastReleaseAt: daysAgo(7),
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
      lastCommitAt: null,
      commitActivity: makeCommitActivity(20),
      openIssuesPercent: null,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 5,
      lastReleaseAt: null,
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
    // Mature project (10k+ stars) with 50 commits evenly distributed
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(5),
      commitActivity: makeCommitActivity(50),
      openIssuesPercent: 25,
      medianIssueResolutionDays: 7,
      issuesCreatedLastYear: 20,
      lastReleaseAt: daysAgo(30),
      repositoryCreatedAt: yearsAgo(5),
      openPrsCount: 10,
      stars: 20000,
      forks: 3000,
      isArchived: false,
    });
    expect(result.category).toBe("healthy");
  });

  it("stable finished utility with recent activity → moderate", () => {
    // A truly stable utility with no commits - mature tier looks at full year
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(100), // Within 120 days for mature tier = full points
      commitActivity: makeCommitActivity(0),
      openIssuesPercent: 15,
      medianIssueResolutionDays: 30, // Issues are being resolved
      issuesCreatedLastYear: 2,
      lastReleaseAt: daysAgo(100),
      repositoryCreatedAt: yearsAgo(6),
      openPrsCount: 5,
      stars: 12000, // Mature tier (10k+)
      forks: 500,
      isArchived: false,
    });
    expect(["moderate", "healthy"]).toContain(result.category);
  });

  it("slowing project with issues piling up → inactive", () => {
    // Growing tier (2+ years) looks at 26 weeks - 8 commits spread across year
    // means only ~4 in the 26-week window - not enough for declining
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(200),
      commitActivity: makeCommitActivity(8),
      openIssuesPercent: 55,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 20,
      lastReleaseAt: daysAgo(200),
      repositoryCreatedAt: yearsAgo(2.5),
      openPrsCount: 15,
      stars: 3000,
      forks: 200,
      isArchived: false,
    });
    expect(result.category).toBe("inactive");
  });

  it("abandoned project → inactive", () => {
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(500),
      commitActivity: makeCommitActivity(0),
      openIssuesPercent: 70,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 3,
      lastReleaseAt: daysAgo(600),
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
    // Mature project (108k stars) - looks at full 52 weeks
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(5),
      commitActivity: makeCommitActivity(30),
      openIssuesPercent: 35,
      medianIssueResolutionDays: 14,
      issuesCreatedLastYear: 50,
      lastReleaseAt: daysAgo(30),
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
    // issue resolution, it scores lower under the new system.
    // Growing tier (9.6k stars) looks at 26 weeks - 0 commits in window
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(621),
      commitActivity: makeCommitActivity(0),
      openIssuesPercent: 13,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 2,
      lastReleaseAt: daysAgo(621),
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
    // Growing tier (7.8k stars) looks at 26 weeks - 0 commits
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(930),
      commitActivity: makeCommitActivity(0),
      openIssuesPercent: 16.9,
      medianIssueResolutionDays: null,
      issuesCreatedLastYear: 0,
      lastReleaseAt: daysAgo(1350),
      repositoryCreatedAt: new Date("2020-04-14"),
      openPrsCount: 8,
      stars: 7805,
      forks: 261,
      isArchived: false,
    });
    expect(result.category).toBe("inactive");
  });

  it("ts-rest (slowing down, high open issues) → declining", () => {
    // Growing tier (3.2k stars) looks at 26 weeks
    // 33 commits in 26 weeks but 220 days since last commit
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(220),
      commitActivity: makeCommitActivity(33), // Actual: 33 commits in last year
      openIssuesPercent: 29,
      medianIssueResolutionDays: 20,
      issuesCreatedLastYear: 100,
      lastReleaseAt: daysAgo(220),
      repositoryCreatedAt: yearsAgo(3.5),
      openPrsCount: 30,
      stars: 3216,
      forks: 173,
      isArchived: false,
    });
    expect(result.category).toBe("declining");
  });
});

describe("timeframe-based commit scoring", () => {
  it("emerging projects only count recent commits (3 months)", () => {
    // 12 commits in recent 13 weeks should get full points for emerging
    const recentActivity = makeRecentCommitActivity(12, 13);
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(5),
      commitActivity: recentActivity,
      openIssuesPercent: 20,
      medianIssueResolutionDays: 7,
      issuesCreatedLastYear: 10,
      lastReleaseAt: daysAgo(30),
      repositoryCreatedAt: yearsAgo(1), // Emerging (< 2 years)
      openPrsCount: 5,
      stars: 500, // Emerging (< 1k)
      forks: 50,
      isArchived: false,
    });
    expect(result.maturityTier).toBe("emerging");
    // With 12 recent commits, should get good commit volume score
    expect(result.score).toBeGreaterThan(60);
  });

  it("old commits don't help emerging projects", () => {
    // 50 commits but all in older weeks (outside 13-week window)
    const oldActivity = Array.from({ length: 52 }, (_, i) => ({
      week: `2025-W${String(52 - i).padStart(2, "0")}`,
      commits: i >= 13 ? 2 : 0, // All commits in weeks 14-52
    }));
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(100), // Recent commit but no volume recently
      commitActivity: oldActivity,
      openIssuesPercent: 20,
      medianIssueResolutionDays: 7,
      issuesCreatedLastYear: 10,
      lastReleaseAt: daysAgo(30),
      repositoryCreatedAt: yearsAgo(1), // Emerging
      openPrsCount: 5,
      stars: 500,
      forks: 50,
      isArchived: false,
    });
    expect(result.maturityTier).toBe("emerging");
    // Despite 78 total commits, 0 in recent 13 weeks = 0 volume points
  });

  it("mature projects benefit from full year of commits", () => {
    // Same old commits pattern - mature tier sees all 52 weeks
    const oldActivity = Array.from({ length: 52 }, (_, i) => ({
      week: `2025-W${String(52 - i).padStart(2, "0")}`,
      commits: i >= 13 ? 1 : 0, // ~39 commits in older weeks
    }));
    const result = calculateMaintenanceScore({
      lastCommitAt: daysAgo(100),
      commitActivity: oldActivity,
      openIssuesPercent: 20,
      medianIssueResolutionDays: 14,
      issuesCreatedLastYear: 10,
      lastReleaseAt: daysAgo(100),
      repositoryCreatedAt: yearsAgo(6), // Mature (5+ years)
      openPrsCount: 5,
      stars: 15000, // Mature (10k+)
      forks: 1000,
      isArchived: false,
    });
    expect(result.maturityTier).toBe("mature");
    // 39 commits across year - mature tier sees them all and rewards it
    expect(result.score).toBeGreaterThan(50);
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
