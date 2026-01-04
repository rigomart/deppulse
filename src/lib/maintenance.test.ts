import { describe, expect, it } from "vitest";
import {
  calculateMaintenanceScore,
  determineMaturityTier,
  MAINTENANCE_CATEGORY_INFO,
  type MaintenanceCategory,
  type MaintenanceInput,
} from "./maintenance";

// Helper to create a base input with sensible defaults
function createInput(
  overrides: Partial<MaintenanceInput> = {},
): MaintenanceInput {
  return {
    daysSinceLastCommit: 10,
    commitsLast90Days: 50,
    openIssuesPercent: 20,
    medianIssueResolutionDays: 7,
    issuesCreatedLast90Days: 5,
    daysSinceLastRelease: 30,
    repositoryCreatedAt: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000), // 3 years old
    openPrsCount: 5,
    stars: 5000,
    forks: 500,
    isArchived: false,
    ...overrides,
  };
}

describe("determineMaturityTier", () => {
  it("returns 'emerging' for young low-star projects", () => {
    const createdAt = new Date(Date.now() - 1 * 365 * 24 * 60 * 60 * 1000); // 1 year old
    expect(determineMaturityTier(createdAt, 500, 50)).toBe("emerging");
  });

  it("returns 'growing' for projects with 2+ years", () => {
    const createdAt = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000); // 3 years old
    expect(determineMaturityTier(createdAt, 500, 50)).toBe("growing");
  });

  it("returns 'growing' for projects with 1k+ stars", () => {
    const createdAt = new Date(Date.now() - 1 * 365 * 24 * 60 * 60 * 1000); // 1 year old
    expect(determineMaturityTier(createdAt, 1500, 100)).toBe("growing");
  });

  it("returns 'mature' for 5+ year old projects with 10k+ stars", () => {
    const createdAt = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000); // 6 years old
    expect(determineMaturityTier(createdAt, 15000, 2000)).toBe("mature");
  });

  it("uses OR logic for mature tier (age OR stars)", () => {
    // Old but low stars = still mature (5+ years)
    const oldLowStars = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000);
    expect(determineMaturityTier(oldLowStars, 500, 50)).toBe("mature");

    // Young but high stars = still mature (10k+ popularity)
    const youngHighStars = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    expect(determineMaturityTier(youngHighStars, 20000, 3000)).toBe("mature");
  });
});

describe("calculateMaintenanceScore", () => {
  describe("archived repos", () => {
    it("returns score 0 and unmaintained for archived repos", () => {
      const result = calculateMaintenanceScore(
        createInput({ isArchived: true }),
      );
      expect(result.score).toBe(0);
      expect(result.category).toBe("unmaintained");
    });
  });

  describe("category boundaries", () => {
    it("returns 'healthy' for score >= 70", () => {
      const result = calculateMaintenanceScore(
        createInput({
          daysSinceLastCommit: 5,
          commitsLast90Days: 100,
          openIssuesPercent: 10,
          medianIssueResolutionDays: 3,
          issuesCreatedLast90Days: 2,
          daysSinceLastRelease: 20,
          openPrsCount: 2,
          stars: 5000,
          forks: 500,
        }),
      );
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.category).toBe("healthy");
    });

    it("returns 'moderate' for score 45-69", () => {
      const result = calculateMaintenanceScore(
        createInput({
          daysSinceLastCommit: 120,
          commitsLast90Days: 10,
          openIssuesPercent: 40,
          medianIssueResolutionDays: 35,
          issuesCreatedLast90Days: 18,
          daysSinceLastRelease: 200,
          openPrsCount: 18,
          stars: 1200,
          forks: 120,
        }),
      );
      expect(result.score).toBeGreaterThanOrEqual(45);
      expect(result.score).toBeLessThan(70);
      expect(result.category).toBe("moderate");
    });

    it("returns 'unmaintained' for very low scores", () => {
      const result = calculateMaintenanceScore(
        createInput({
          daysSinceLastCommit: 500,
          commitsLast90Days: 0,
          openIssuesPercent: 90,
          medianIssueResolutionDays: 200,
          issuesCreatedLast90Days: 100,
          daysSinceLastRelease: 800,
          openPrsCount: 150,
          stars: 10,
          forks: 1,
          repositoryCreatedAt: new Date(
            Date.now() - 0.5 * 365 * 24 * 60 * 60 * 1000,
          ),
        }),
      );
      expect(result.score).toBeLessThan(20);
      expect(result.category).toBe("unmaintained");
    });
  });

  describe("maturity tier affects thresholds", () => {
    it("emerging projects need stricter commit recency", () => {
      const emerging = createInput({
        daysSinceLastCommit: 80, // Beyond 60 days for emerging
        repositoryCreatedAt: new Date(
          Date.now() - 1 * 365 * 24 * 60 * 60 * 1000,
        ),
        stars: 100,
        forks: 10,
      });

      const mature = createInput({
        daysSinceLastCommit: 80, // Within 180 days for mature
        repositoryCreatedAt: new Date(
          Date.now() - 7 * 365 * 24 * 60 * 60 * 1000,
        ),
        stars: 20000,
        forks: 3000,
      });

      const emergingResult = calculateMaintenanceScore(emerging);
      const matureResult = calculateMaintenanceScore(mature);

      // Mature project should score higher with same commit recency
      expect(matureResult.score).toBeGreaterThan(emergingResult.score);
    });
  });

  describe("finished vs abandoned projects", () => {
    it("finished project: low activity + low issues + low velocity = moderate score", () => {
      const result = calculateMaintenanceScore(
        createInput({
          daysSinceLastCommit: 200, // No recent commits
          commitsLast90Days: 0,
          openIssuesPercent: 5, // Very few open issues
          medianIssueResolutionDays: 3,
          issuesCreatedLast90Days: 1, // Low velocity - few new issues
          daysSinceLastRelease: 400,
          repositoryCreatedAt: new Date(
            Date.now() - 5 * 365 * 24 * 60 * 60 * 1000,
          ),
          stars: 5000,
          forks: 500,
        }),
      );
      // Should still get decent score from responsiveness + stability + community
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(["moderate", "at-risk"]).toContain(result.category);
    });

    it("abandoned project: low activity + high issues + high velocity = low score", () => {
      const result = calculateMaintenanceScore(
        createInput({
          daysSinceLastCommit: 200, // No recent commits
          commitsLast90Days: 0,
          openIssuesPercent: 85, // Many open issues
          medianIssueResolutionDays: 150,
          issuesCreatedLast90Days: 60, // High velocity - many new issues being filed
          daysSinceLastRelease: 400,
          repositoryCreatedAt: new Date(
            Date.now() - 5 * 365 * 24 * 60 * 60 * 1000,
          ),
          stars: 5000,
          forks: 500,
        }),
      );
      // Should get low score due to responsiveness issues
      expect(result.score).toBeLessThan(40);
      expect(["at-risk", "unmaintained"]).toContain(result.category);
    });
  });

  describe("null handling", () => {
    it("null daysSinceLastCommit gives 0 activity points", () => {
      const withNull = calculateMaintenanceScore(
        createInput({ daysSinceLastCommit: null }),
      );
      const withRecent = calculateMaintenanceScore(
        createInput({ daysSinceLastCommit: 5 }),
      );
      expect(withRecent.score).toBeGreaterThan(withNull.score);
    });

    it("null daysSinceLastRelease gives neutral score", () => {
      const withNull = calculateMaintenanceScore(
        createInput({ daysSinceLastRelease: null }),
      );
      const withRecent = calculateMaintenanceScore(
        createInput({ daysSinceLastRelease: 30 }),
      );
      // Difference should be small (neutral handling)
      expect(Math.abs(withRecent.score - withNull.score)).toBeLessThan(10);
    });

    it("null issue metrics give neutral scores", () => {
      const withNulls = calculateMaintenanceScore(
        createInput({
          openIssuesPercent: null,
          medianIssueResolutionDays: null,
        }),
      );
      // Should still get a reasonable score
      expect(withNulls.score).toBeGreaterThan(40);
    });

    it("null repositoryCreatedAt defaults to growing tier", () => {
      const result = calculateMaintenanceScore(
        createInput({ repositoryCreatedAt: null }),
      );
      expect(result.maturityTier).toBe("growing");
    });
  });

  describe("real-world scenarios", () => {
    it("actively maintained popular project scores healthy", () => {
      const result = calculateMaintenanceScore({
        daysSinceLastCommit: 2,
        commitsLast90Days: 150,
        openIssuesPercent: 15,
        medianIssueResolutionDays: 5,
        issuesCreatedLast90Days: 20,
        daysSinceLastRelease: 14,
        repositoryCreatedAt: new Date(
          Date.now() - 6 * 365 * 24 * 60 * 60 * 1000,
        ), // 6 years to be clearly mature
        openPrsCount: 8,
        stars: 30000,
        forks: 5000,
        isArchived: false,
      });
      expect(result.category).toBe("healthy");
      expect(result.maturityTier).toBe("mature");
    });

    it("new promising project scores moderate or at-risk", () => {
      const result = calculateMaintenanceScore({
        daysSinceLastCommit: 70, // Beyond 60 days for emerging tier
        commitsLast90Days: 8,
        openIssuesPercent: 30,
        medianIssueResolutionDays: 15,
        issuesCreatedLast90Days: 12,
        daysSinceLastRelease: 100,
        repositoryCreatedAt: new Date(
          Date.now() - 0.5 * 365 * 24 * 60 * 60 * 1000,
        ),
        openPrsCount: 8,
        stars: 200,
        forks: 20,
        isArchived: false,
      });
      // New project with low stars and moderate metrics
      expect(["moderate", "at-risk"]).toContain(result.category);
      expect(result.maturityTier).toBe("emerging");
    });

    it("stable utility library with no recent activity scores healthy or moderate", () => {
      const result = calculateMaintenanceScore({
        daysSinceLastCommit: 300,
        commitsLast90Days: 0,
        openIssuesPercent: 10,
        medianIssueResolutionDays: 5,
        issuesCreatedLast90Days: 2,
        daysSinceLastRelease: 400,
        repositoryCreatedAt: new Date(
          Date.now() - 8 * 365 * 24 * 60 * 60 * 1000,
        ),
        openPrsCount: 2,
        stars: 15000,
        forks: 2000,
        isArchived: false,
      });
      // Mature projects with excellent issue metrics can score healthy even with low activity
      expect(["healthy", "moderate"]).toContain(result.category);
      expect(result.maturityTier).toBe("mature");
    });
  });
});

describe("real-world project categories", () => {
  it("stitches (explicitly unmaintained) should be 'unmaintained'", () => {
    // https://github.com/stitchesjs/stitches
    // Description says "[Not Actively Maintained]"
    // Last commit: June 2023 (~570 days), Last release: April 2022 (~980 days)
    // 120 open issues (55%), 7.8k stars
    // High open issues + low velocity = abandonment (people gave up filing)
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 570,
      commitsLast90Days: 0,
      openIssuesPercent: 55, // ~120 open out of ~220 total - HIGH
      medianIssueResolutionDays: null, // No recent closed issues
      issuesCreatedLast90Days: 2, // Low velocity + high open % = abandonment
      daysSinceLastRelease: 980,
      repositoryCreatedAt: new Date(Date.now() - 4.7 * 365 * 24 * 60 * 60 * 1000),
      openPrsCount: 15,
      stars: 7805,
      forks: 261,
      isArchived: false,
    });
    expect(result.category).toBe("unmaintained");
  });

  it("clsx (stable utility) should be 'moderate' or 'healthy'", () => {
    // https://github.com/lukeed/clsx
    // Stable, finished utility - doesn't need frequent updates
    // Real data (Jan 2026): last commit April 2024 = 621 days, 13% open issues
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 621, // Real: April 2024 → Jan 2026
      commitsLast90Days: 0,
      openIssuesPercent: 13.1, // Very low - stable project
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 2,
      daysSinceLastRelease: 621, // Same as last commit
      repositoryCreatedAt: new Date("2018-12-24"),
      openPrsCount: 6,
      stars: 9602,
      forks: 162,
      isArchived: false,
    });
    expect(["moderate", "healthy"]).toContain(result.category);
  });

  it("axios (actively maintained) should be 'healthy'", () => {
    // https://github.com/axios/axios
    // Very active, 108k stars, recent commits
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 5,
      commitsLast90Days: 30,
      openIssuesPercent: 35, // 306 open issues but many total
      medianIssueResolutionDays: 14,
      issuesCreatedLast90Days: 50,
      daysSinceLastRelease: 30,
      repositoryCreatedAt: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),
      openPrsCount: 20,
      stars: 108428,
      forks: 11471,
      isArchived: false,
    });
    expect(result.category).toBe("healthy");
  });

  it("next-international (stale, many issues) should be 'unmaintained' or 'at-risk'", () => {
    // https://github.com/QuiiBz/next-international
    // Last release: Oct 2024 (~430 days), 103 open issues
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 430,
      commitsLast90Days: 0,
      openIssuesPercent: 60,
      medianIssueResolutionDays: null,
      issuesCreatedLast90Days: 3,
      daysSinceLastRelease: 430,
      repositoryCreatedAt: new Date(Date.now() - 2.5 * 365 * 24 * 60 * 60 * 1000),
      openPrsCount: 8,
      stars: 1449,
      forks: 69,
      isArchived: false,
    });
    expect(["unmaintained", "at-risk"]).toContain(result.category);
  });

  it("ts-rest (slowing down) should be 'at-risk'", () => {
    // https://github.com/ts-rest/ts-rest
    // Last activity: June 2025 (~7 months), 134 open issues, slowing development
    const result = calculateMaintenanceScore({
      daysSinceLastCommit: 210,
      commitsLast90Days: 2,
      openIssuesPercent: 55, // High open issues indicates neglect
      medianIssueResolutionDays: null, // No recent resolutions
      issuesCreatedLast90Days: 5,
      daysSinceLastRelease: 210,
      repositoryCreatedAt: new Date(Date.now() - 2.5 * 365 * 24 * 60 * 60 * 1000),
      openPrsCount: 15,
      stars: 3212,
      forks: 174,
      isArchived: false,
    });
    expect(result.category).toBe("at-risk");
  });
});

describe("MAINTENANCE_CATEGORY_INFO", () => {
  it("has label, description, and recommendation for all categories", () => {
    const categories: MaintenanceCategory[] = [
      "healthy",
      "moderate",
      "at-risk",
      "unmaintained",
    ];
    for (const category of categories) {
      expect(MAINTENANCE_CATEGORY_INFO[category].label).toBeTruthy();
      expect(MAINTENANCE_CATEGORY_INFO[category].description).toBeTruthy();
      expect(MAINTENANCE_CATEGORY_INFO[category].recommendation).toBeTruthy();
    }
  });
});
