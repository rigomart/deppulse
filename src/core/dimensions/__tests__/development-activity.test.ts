import { describe, expect, it } from "vitest";
import { rateDevelopmentActivity } from "../development-activity";
import { daysAgo, makeSnapshot, NOW } from "./fixtures";

describe("rateDevelopmentActivity", () => {
  it("rates strong when commits are high and recent", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({ commitsLast90Days: 20, lastCommitAt: daysAgo(5) }),
      NOW,
    );
    expect(result.level).toBe("strong");
    expect(result.dimension).toBe("development-activity");
  });

  it("requires BOTH high commits AND recency for strong", () => {
    // High commits but old last commit
    const result = rateDevelopmentActivity(
      makeSnapshot({ commitsLast90Days: 20, lastCommitAt: daysAgo(45) }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with moderate commits", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({ commitsLast90Days: 5, lastCommitAt: daysAgo(60) }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with recent commit even if few commits", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({ commitsLast90Days: 1, lastCommitAt: daysAgo(10) }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates weak with low commits and old last commit", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({ commitsLast90Days: 2, lastCommitAt: daysAgo(120) }),
      NOW,
    );
    expect(result.level).toBe("weak");
  });

  it("rates inactive when lastCommitAt is null", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({ lastCommitAt: null }),
      NOW,
    );
    expect(result.level).toBe("inactive");
  });

  it("rates inactive when last commit is over a year ago", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({ commitsLast90Days: 0, lastCommitAt: daysAgo(400) }),
      NOW,
    );
    expect(result.level).toBe("inactive");
  });

  it("includes relevant inputs in the result", () => {
    const result = rateDevelopmentActivity(
      makeSnapshot({
        commitsLast90Days: 20,
        commitsLast30Days: 8,
        mergedPrsLast90Days: 5,
        lastCommitAt: daysAgo(3),
      }),
      NOW,
    );
    expect(result.inputs.commits90d).toBe(20);
    expect(result.inputs.commitsLast30Days).toBe(8);
    expect(result.inputs.mergedPrs90d).toBe(5);
    expect(result.inputs.daysSinceLastCommit).toBe(3);
  });

  describe("boundary conditions", () => {
    it("strong at exactly 15 commits and 30 days", () => {
      const result = rateDevelopmentActivity(
        makeSnapshot({ commitsLast90Days: 15, lastCommitAt: daysAgo(30) }),
        NOW,
      );
      expect(result.level).toBe("strong");
    });

    it("adequate at exactly 4 commits", () => {
      const result = rateDevelopmentActivity(
        makeSnapshot({ commitsLast90Days: 4, lastCommitAt: daysAgo(120) }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("adequate at exactly 90 days since last commit", () => {
      const result = rateDevelopmentActivity(
        makeSnapshot({ commitsLast90Days: 0, lastCommitAt: daysAgo(90) }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("weak at 91 days and 3 commits", () => {
      const result = rateDevelopmentActivity(
        makeSnapshot({ commitsLast90Days: 3, lastCommitAt: daysAgo(91) }),
        NOW,
      );
      expect(result.level).toBe("weak");
    });

    it("weak at exactly 365 days since last commit", () => {
      const result = rateDevelopmentActivity(
        makeSnapshot({ commitsLast90Days: 0, lastCommitAt: daysAgo(365) }),
        NOW,
      );
      expect(result.level).toBe("weak");
    });

    it("inactive at 366 days since last commit", () => {
      const result = rateDevelopmentActivity(
        makeSnapshot({ commitsLast90Days: 0, lastCommitAt: daysAgo(366) }),
        NOW,
      );
      expect(result.level).toBe("inactive");
    });
  });
});
