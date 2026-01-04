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

  it("requires BOTH age and stars for mature tier", () => {
    // Old but low stars
    const oldLowStars = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000);
    expect(determineMaturityTier(oldLowStars, 500, 50)).toBe("growing");

    // Young but high stars
    const youngHighStars = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    expect(determineMaturityTier(youngHighStars, 20000, 3000)).toBe("growing");
  });
});

describe("calculateMaintenanceScore", () => {
  describe("archived repos", () => {
    it("returns score 0 and critical for archived repos", () => {
      const result = calculateMaintenanceScore(
        createInput({ isArchived: true }),
      );
      expect(result.score).toBe(0);
      expect(result.category).toBe("critical");
    });
  });

  describe("category boundaries", () => {
    it("returns 'excellent' for score >= 80", () => {
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
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.category).toBe("excellent");
    });

    it("returns 'good' for score 60-79", () => {
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
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
      expect(result.category).toBe("good");
    });

    it("returns 'critical' for very low scores", () => {
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
      expect(result.category).toBe("critical");
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
    it("finished project: low activity + low issues + low velocity = good score", () => {
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
      expect(["good", "fair"]).toContain(result.category);
    });

    it("abandoned project: low activity + high issues + high velocity = poor score", () => {
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
      // Should get poor score due to responsiveness issues
      expect(result.score).toBeLessThan(40);
      expect(["poor", "critical"]).toContain(result.category);
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
    it("actively maintained popular project scores excellent", () => {
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
      expect(result.category).toBe("excellent");
      expect(result.maturityTier).toBe("mature");
    });

    it("new promising project scores good but not excellent", () => {
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
      expect(["good", "fair"]).toContain(result.category);
      expect(result.maturityTier).toBe("emerging");
    });

    it("stable utility library with no recent activity scores fair", () => {
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
      // Low activity but good issue handling and high community
      expect(["fair", "good"]).toContain(result.category);
      expect(result.maturityTier).toBe("mature");
    });
  });
});

describe("MAINTENANCE_CATEGORY_INFO", () => {
  it("has label, description, and recommendation for all categories", () => {
    const categories: MaintenanceCategory[] = [
      "excellent",
      "good",
      "fair",
      "poor",
      "critical",
    ];
    for (const category of categories) {
      expect(MAINTENANCE_CATEGORY_INFO[category].label).toBeTruthy();
      expect(MAINTENANCE_CATEGORY_INFO[category].description).toBeTruthy();
      expect(MAINTENANCE_CATEGORY_INFO[category].recommendation).toBeTruthy();
    }
  });
});
