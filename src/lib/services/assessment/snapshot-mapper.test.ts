import { describe, expect, it } from "vitest";
import { toMetricsSnapshot } from "./snapshot-mapper";

describe("toMetricsSnapshot", () => {
  it("converts date fields to ISO strings", () => {
    const repositoryCreatedAt = new Date("2024-01-01T00:00:00.000Z");
    const lastCommitAt = new Date("2024-02-01T00:00:00.000Z");
    const lastReleaseAt = new Date("2024-03-01T00:00:00.000Z");
    const lastClosedIssueAt = new Date("2024-04-01T00:00:00.000Z");

    const snapshot = toMetricsSnapshot({
      description: "repo",
      stars: 10,
      forks: 5,
      avatarUrl: "https://example.com/avatar.png",
      htmlUrl: "https://github.com/acme/repo",
      license: "MIT",
      language: "TypeScript",
      repositoryCreatedAt,
      isArchived: false,
      lastCommitAt,
      lastReleaseAt,
      lastClosedIssueAt,
      openIssuesPercent: 10,
      openIssuesCount: 1,
      closedIssuesCount: 9,
      medianIssueResolutionDays: 2,
      openPrsCount: 3,
      issuesCreatedLastYear: 4,
      releases: [],
    });

    expect(snapshot.repositoryCreatedAt).toBe(
      repositoryCreatedAt.toISOString(),
    );
    expect(snapshot.lastCommitAt).toBe(lastCommitAt.toISOString());
    expect(snapshot.lastReleaseAt).toBe(lastReleaseAt.toISOString());
    expect(snapshot.lastClosedIssueAt).toBe(lastClosedIssueAt.toISOString());
  });

  it("preserves null date fields", () => {
    const snapshot = toMetricsSnapshot({
      description: null,
      stars: 0,
      forks: 0,
      avatarUrl: "https://example.com/avatar.png",
      htmlUrl: "https://github.com/acme/repo",
      license: null,
      language: null,
      repositoryCreatedAt: null,
      isArchived: false,
      lastCommitAt: null,
      lastReleaseAt: null,
      lastClosedIssueAt: null,
      openIssuesPercent: null,
      openIssuesCount: 0,
      closedIssuesCount: 0,
      medianIssueResolutionDays: null,
      openPrsCount: 0,
      issuesCreatedLastYear: 0,
      releases: [],
    });

    expect(snapshot.repositoryCreatedAt).toBeNull();
    expect(snapshot.lastCommitAt).toBeNull();
    expect(snapshot.lastReleaseAt).toBeNull();
    expect(snapshot.lastClosedIssueAt).toBeNull();
  });
});
