import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { detectRedFlags } from "./red-flags";

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
    releases: [
      {
        tagName: "v1.0.0",
        name: "v1.0.0",
        publishedAt: daysAgo(30),
      },
    ],
    ...overrides,
  };
}

function hasFlag(snapshot: MetricsSnapshot, id: string): boolean {
  return detectRedFlags(snapshot).some((f) => f.id === id);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("detectRedFlags", () => {
  describe("healthy repository", () => {
    it("returns no flags for a well-maintained repo", () => {
      expect(detectRedFlags(makeSnapshot())).toHaveLength(0);
    });
  });

  describe("archived_repository", () => {
    it("flags archived repositories as critical", () => {
      const flags = detectRedFlags(makeSnapshot({ isArchived: true }));
      const flag = flags.find((f) => f.id === "archived_repository");
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe("critical");
    });

    it("does not flag non-archived repositories", () => {
      expect(
        hasFlag(makeSnapshot({ isArchived: false }), "archived_repository"),
      ).toBe(false);
    });
  });

  describe("extended_inactivity", () => {
    it("flags repos with no activity for 180+ days as critical", () => {
      const flags = detectRedFlags(
        makeSnapshot({
          lastCommitAt: daysAgo(200),
          lastMergedPrAt: daysAgo(250),
          lastReleaseAt: daysAgo(300),
        }),
      );
      const flag = flags.find((f) => f.id === "extended_inactivity");
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe("critical");
    });

    it("does not flag repos with recent commits", () => {
      expect(
        hasFlag(
          makeSnapshot({
            lastCommitAt: daysAgo(10),
            lastMergedPrAt: daysAgo(200),
            lastReleaseAt: daysAgo(300),
          }),
          "extended_inactivity",
        ),
      ).toBe(false);
    });

    it("does not flag when all activity dates are null", () => {
      expect(
        hasFlag(
          makeSnapshot({
            lastCommitAt: null,
            lastMergedPrAt: null,
            lastReleaseAt: null,
          }),
          "extended_inactivity",
        ),
      ).toBe(false);
    });

    it("uses the most recent of all activity dates", () => {
      // Most recent is 100 days ago (< 180 threshold)
      expect(
        hasFlag(
          makeSnapshot({
            lastCommitAt: daysAgo(100),
            lastMergedPrAt: daysAgo(300),
            lastReleaseAt: daysAgo(400),
          }),
          "extended_inactivity",
        ),
      ).toBe(false);
    });

    it("fires at exactly 180 days", () => {
      expect(
        hasFlag(
          makeSnapshot({
            lastCommitAt: daysAgo(180),
            lastMergedPrAt: null,
            lastReleaseAt: null,
          }),
          "extended_inactivity",
        ),
      ).toBe(true);
    });
  });

  describe("no_release_despite_commits", () => {
    it("flags active repos with no recent release", () => {
      expect(
        hasFlag(
          makeSnapshot({
            commitsLast90Days: 20,
            lastReleaseAt: daysAgo(200),
            releases: [
              { tagName: "v0.1.0", name: null, publishedAt: daysAgo(200) },
            ],
          }),
          "no_release_despite_commits",
        ),
      ).toBe(true);
    });

    it("flags active repos that have never released", () => {
      expect(
        hasFlag(
          makeSnapshot({
            commitsLast90Days: 20,
            lastReleaseAt: null,
            releases: [],
          }),
          "no_release_despite_commits",
        ),
      ).toBe(true);
    });

    it("does not flag repos with recent releases", () => {
      expect(
        hasFlag(
          makeSnapshot({
            commitsLast90Days: 20,
            lastReleaseAt: daysAgo(30),
          }),
          "no_release_despite_commits",
        ),
      ).toBe(false);
    });

    it("does not flag repos with few commits", () => {
      expect(
        hasFlag(
          makeSnapshot({
            commitsLast90Days: 2,
            lastReleaseAt: daysAgo(200),
          }),
          "no_release_despite_commits",
        ),
      ).toBe(false);
    });
  });

  describe("stale_pull_requests", () => {
    it("flags repos with open PRs and zero merges in 90 days", () => {
      expect(
        hasFlag(
          makeSnapshot({
            openPrsCount: 5,
            mergedPrsLast90Days: 0,
          }),
          "stale_pull_requests",
        ),
      ).toBe(true);
    });

    it("does not flag repos with any recent merges", () => {
      expect(
        hasFlag(
          makeSnapshot({
            openPrsCount: 20,
            mergedPrsLast90Days: 1,
          }),
          "stale_pull_requests",
        ),
      ).toBe(false);
    });

    it("does not flag repos with fewer than 3 open PRs", () => {
      expect(
        hasFlag(
          makeSnapshot({
            openPrsCount: 2,
            mergedPrsLast90Days: 0,
          }),
          "stale_pull_requests",
        ),
      ).toBe(false);
    });
  });

  describe("no_issues_activity", () => {
    it("flags active repos with zero issue tracker usage", () => {
      expect(
        hasFlag(
          makeSnapshot({
            issuesCreatedLastYear: 0,
            closedIssuesCount: 0,
            lastClosedIssueAt: null,
            openIssuesCount: 0,
            commitsLast90Days: 10,
          }),
          "no_issues_activity",
        ),
      ).toBe(true);
    });

    it("does not flag repos with recent issue activity", () => {
      expect(
        hasFlag(
          makeSnapshot({
            issuesCreatedLastYear: 5,
            lastClosedIssueAt: daysAgo(30),
            openIssuesCount: 2,
          }),
          "no_issues_activity",
        ),
      ).toBe(false);
    });

    it("flags repos where last closed issue is older than the activity window", () => {
      expect(
        hasFlag(
          makeSnapshot({
            issuesCreatedLastYear: 0,
            lastClosedIssueAt: daysAgo(400),
            closedIssuesCount: 10,
            openIssuesCount: 0,
            commitsLast90Days: 10,
          }),
          "no_issues_activity",
        ),
      ).toBe(true);
    });

    it("does not flag inactive repos with no issues", () => {
      expect(
        hasFlag(
          makeSnapshot({
            issuesCreatedLastYear: 0,
            closedIssuesCount: 0,
            openIssuesCount: 0,
            commitsLast90Days: 1,
          }),
          "no_issues_activity",
        ),
      ).toBe(false);
    });
  });

  describe("no_releases_ever", () => {
    it("flags mature active repos that never released", () => {
      expect(
        hasFlag(
          makeSnapshot({
            releases: [],
            repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
            commitsLast365Days: 50,
          }),
          "no_releases_ever",
        ),
      ).toBe(true);
    });

    it("does not flag young repos", () => {
      expect(
        hasFlag(
          makeSnapshot({
            releases: [],
            repositoryCreatedAt: daysAgo(100),
            commitsLast365Days: 50,
          }),
          "no_releases_ever",
        ),
      ).toBe(false);
    });

    it("does not flag repos with releases", () => {
      expect(
        hasFlag(
          makeSnapshot({
            releases: [
              { tagName: "v1.0.0", name: null, publishedAt: daysAgo(30) },
            ],
          }),
          "no_releases_ever",
        ),
      ).toBe(false);
    });

    it("does not flag inactive repos without releases", () => {
      expect(
        hasFlag(
          makeSnapshot({
            releases: [],
            repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
            commitsLast365Days: 2,
          }),
          "no_releases_ever",
        ),
      ).toBe(false);
    });

    it("estimates yearly commits from 90-day count when 365-day data is missing", () => {
      expect(
        hasFlag(
          makeSnapshot({
            releases: [],
            repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
            commitsLast90Days: 5,
            commitsLast365Days: undefined,
          }),
          "no_releases_ever",
        ),
      ).toBe(true); // 5 * 4 = 20 >= 10
    });
  });

  describe("multiple flags", () => {
    it("returns multiple flags when several conditions are met", () => {
      const flags = detectRedFlags(
        makeSnapshot({
          isArchived: true,
          lastCommitAt: daysAgo(200),
          lastMergedPrAt: daysAgo(250),
          lastReleaseAt: daysAgo(300),
        }),
      );
      expect(flags.length).toBeGreaterThanOrEqual(2);
      expect(flags.some((f) => f.id === "archived_repository")).toBe(true);
      expect(flags.some((f) => f.id === "extended_inactivity")).toBe(true);
    });

    it("returns critical flags alongside warning flags", () => {
      const flags = detectRedFlags(
        makeSnapshot({
          lastCommitAt: daysAgo(200),
          lastMergedPrAt: daysAgo(200),
          lastReleaseAt: daysAgo(200),
          commitsLast90Days: 10,
          openPrsCount: 5,
          mergedPrsLast90Days: 0,
        }),
      );
      expect(flags.some((f) => f.severity === "critical")).toBe(true);
      expect(flags.some((f) => f.severity === "warning")).toBe(true);
    });
  });

  describe("severity", () => {
    it("archived_repository is always critical", () => {
      const flags = detectRedFlags(makeSnapshot({ isArchived: true }));
      const flag = flags.find((f) => f.id === "archived_repository");
      expect(flag?.severity).toBe("critical");
    });

    it("extended_inactivity is always critical", () => {
      const flags = detectRedFlags(
        makeSnapshot({
          lastCommitAt: daysAgo(200),
          lastMergedPrAt: null,
          lastReleaseAt: null,
        }),
      );
      const flag = flags.find((f) => f.id === "extended_inactivity");
      expect(flag?.severity).toBe("critical");
    });

    it("stale_pull_requests is critical", () => {
      const flags = detectRedFlags(
        makeSnapshot({
          openPrsCount: 5,
          mergedPrsLast90Days: 0,
        }),
      );
      const flag = flags.find((f) => f.id === "stale_pull_requests");
      expect(flag?.severity).toBe("critical");
    });

    it("remaining contextual flags are warning", () => {
      const warningIds = [
        "no_release_despite_commits",
        "no_issues_activity",
        "no_releases_ever",
      ];
      const flags = detectRedFlags(
        makeSnapshot({
          commitsLast90Days: 20,
          lastReleaseAt: null,
          releases: [],
          repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
          commitsLast365Days: 50,
          issuesCreatedLastYear: 0,
          closedIssuesCount: 0,
          lastClosedIssueAt: null,
          openIssuesCount: 0,
        }),
      );
      for (const id of warningIds) {
        const flag = flags.find((f) => f.id === id);
        expect(flag?.severity, `${id} should be warning`).toBe("warning");
      }
    });
  });
});
