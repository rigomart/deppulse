import { describe, expect, it } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { rateDevelopmentActivity } from "../development-activity";

const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function makeSnapshot(
  overrides: Partial<MetricsSnapshot> = {},
): MetricsSnapshot {
  return {
    description: "A test repo",
    stars: 700,
    forks: 100,
    avatarUrl: "",
    htmlUrl: "",
    license: "MIT",
    language: "TypeScript",
    repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
    isArchived: false,
    lastCommitAt: daysAgo(3),
    lastReleaseAt: daysAgo(30),
    lastClosedIssueAt: daysAgo(10),
    lastMergedPrAt: daysAgo(5),
    openIssuesPercent: 20,
    openIssuesCount: 20,
    closedIssuesCount: 80,
    medianIssueResolutionDays: 9,
    openPrsCount: 3,
    issuesCreatedLastYear: 14,
    commitsLast90Days: 10,
    mergedPrsLast90Days: 6,
    releases: [{ tagName: "v1.0.0", name: "v1.0.0", publishedAt: daysAgo(30) }],
    ...overrides,
  };
}

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
