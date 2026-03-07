import { describe, expect, it } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { rateIssueManagement } from "../issue-management";

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

describe("rateIssueManagement", () => {
  it("rates strong with low open ratio and fast resolution", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 15, medianIssueResolutionDays: 7 }),
      NOW,
    );
    expect(result.level).toBe("strong");
  });

  it("requires BOTH low open ratio AND fast resolution for strong", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 15, medianIssueResolutionDays: 20 }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with moderate open ratio", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 40, medianIssueResolutionDays: 60 }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with moderate resolution time", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 70, medianIssueResolutionDays: 20 }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates weak with high open ratio and slow resolution", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 80, medianIssueResolutionDays: 60 }),
      NOW,
    );
    expect(result.level).toBe("weak");
  });

  it("rates adequate when no issues exist at all", () => {
    const result = rateIssueManagement(
      makeSnapshot({
        openIssuesCount: 0,
        closedIssuesCount: 0,
        openIssuesPercent: null,
        medianIssueResolutionDays: null,
      }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates inactive when issues exist but none ever closed", () => {
    const result = rateIssueManagement(
      makeSnapshot({
        openIssuesCount: 10,
        closedIssuesCount: 0,
        openIssuesPercent: null,
        medianIssueResolutionDays: null,
        lastClosedIssueAt: null,
      }),
      NOW,
    );
    expect(result.level).toBe("inactive");
  });

  it("includes relevant inputs in the result", () => {
    const result = rateIssueManagement(
      makeSnapshot({
        openIssuesPercent: 20,
        medianIssueResolutionDays: 9,
        openIssuesCount: 20,
        closedIssuesCount: 80,
        lastClosedIssueAt: daysAgo(10),
      }),
      NOW,
    );
    expect(result.inputs.openIssuesPercent).toBe(20);
    expect(result.inputs.medianResolutionDays).toBe(9);
    expect(result.inputs.daysSinceLastClosed).toBe(10);
  });

  describe("boundary conditions", () => {
    it("strong at exactly 25% open and 14 day resolution", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 25,
          medianIssueResolutionDays: 14,
        }),
        NOW,
      );
      expect(result.level).toBe("strong");
    });

    it("adequate at exactly 50% open", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 50,
          medianIssueResolutionDays: 60,
        }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("adequate at exactly 30 day resolution", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 80,
          medianIssueResolutionDays: 30,
        }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("weak at 51% open and 31 day resolution", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 51,
          medianIssueResolutionDays: 31,
        }),
        NOW,
      );
      expect(result.level).toBe("weak");
    });
  });
});
