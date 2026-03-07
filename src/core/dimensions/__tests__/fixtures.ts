import type { MetricsSnapshot } from "@/lib/domain/assessment";

export const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

export function makeSnapshot(
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
