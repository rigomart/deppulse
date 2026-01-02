import { describe, expect, it } from "vitest";
import { calculateRisk, RISK_CATEGORY_INFO, type RiskCategory } from "./risk";

describe("calculateRisk", () => {
  describe("category boundaries", () => {
    it("returns 'active' for score <= 20", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 0,
        commitsLast90Days: 0, // 20 points - exactly at boundary
        daysSinceLastRelease: 0,
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(result.score).toBe(20);
      expect(result.category).toBe("active");
    });

    it("returns 'stable' for score 21-40", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 60, // 10 points
        commitsLast90Days: 0, // 20 points
        daysSinceLastRelease: 100, // 5 points = 35 total
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(result.score).toBe(35);
      expect(result.category).toBe("stable");
    });

    it("returns 'at-risk' for score 41-65", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 100, // 20 points
        commitsLast90Days: 0, // 20 points
        daysSinceLastRelease: 200, // 10 points = 50 total
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(result.score).toBe(50);
      expect(result.category).toBe("at-risk");
    });

    it("returns 'abandoned' for score > 65", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 200, // 30 points
        commitsLast90Days: 0, // 20 points
        daysSinceLastRelease: 400, // 15 points
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(result.score).toBe(65);
      expect(result.category).toBe("at-risk"); // boundary

      const abandoned = calculateRisk({
        daysSinceLastCommit: 200,
        commitsLast90Days: 0,
        daysSinceLastRelease: 400,
        openIssuesPercent: 30, // +5 = 70
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(abandoned.score).toBe(70);
      expect(abandoned.category).toBe("abandoned");
    });
  });

  describe("score accumulation", () => {
    it("scores 0 for best-case metrics", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 0,
        commitsLast90Days: 100,
        daysSinceLastRelease: 0,
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(result.score).toBe(0);
      expect(result.category).toBe("active");
    });

    it("scores 100 for worst-case metrics", () => {
      const result = calculateRisk({
        daysSinceLastCommit: null, // 30
        commitsLast90Days: 0, // 20
        daysSinceLastRelease: 500, // 15
        openIssuesPercent: 100, // 15
        medianIssueResolutionDays: 100, // 10
        openPrsCount: 200, // 10
      });
      expect(result.score).toBe(100);
      expect(result.category).toBe("abandoned");
    });
  });

  describe("null handling", () => {
    it("treats null daysSinceLastCommit as max risk (no commits)", () => {
      const withNull = calculateRisk({
        daysSinceLastCommit: null,
        commitsLast90Days: 100,
        daysSinceLastRelease: 0,
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(withNull.score).toBe(30);
    });

    it("treats null daysSinceLastRelease as moderate risk (no releases)", () => {
      const withNull = calculateRisk({
        daysSinceLastCommit: 0,
        commitsLast90Days: 100,
        daysSinceLastRelease: null,
        openIssuesPercent: 0,
        medianIssueResolutionDays: 0,
        openPrsCount: 0,
      });
      expect(withNull.score).toBe(10);
    });

    it("treats null issue metrics as no signal (0 points)", () => {
      const withNulls = calculateRisk({
        daysSinceLastCommit: 0,
        commitsLast90Days: 100,
        daysSinceLastRelease: 0,
        openIssuesPercent: null,
        medianIssueResolutionDays: null,
        openPrsCount: 0,
      });
      expect(withNulls.score).toBe(0);
    });
  });

  describe("real-world scenarios", () => {
    it("identifies a healthy active project", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 2,
        commitsLast90Days: 150,
        daysSinceLastRelease: 14,
        openIssuesPercent: 15,
        medianIssueResolutionDays: 3,
        openPrsCount: 5,
      });
      expect(result.category).toBe("active");
    });

    it("identifies an abandoned project", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 400,
        commitsLast90Days: 0,
        daysSinceLastRelease: 800,
        openIssuesPercent: 85,
        medianIssueResolutionDays: 200,
        openPrsCount: 120,
      });
      expect(result.category).toBe("abandoned");
    });

    it("handles project with no releases gracefully", () => {
      const result = calculateRisk({
        daysSinceLastCommit: 5,
        commitsLast90Days: 80,
        daysSinceLastRelease: null,
        openIssuesPercent: 10,
        medianIssueResolutionDays: 2,
        openPrsCount: 3,
      });
      // No release adds 10 points, but still active
      expect(result.score).toBe(10);
      expect(result.category).toBe("active");
    });
  });
});

describe("RISK_CATEGORY_INFO", () => {
  it("has label and description for all categories", () => {
    const categories: RiskCategory[] = [
      "active",
      "stable",
      "at-risk",
      "abandoned",
    ];
    for (const category of categories) {
      expect(RISK_CATEGORY_INFO[category].label).toBeTruthy();
      expect(RISK_CATEGORY_INFO[category].description).toBeTruthy();
    }
  });
});
