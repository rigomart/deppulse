import { describe, expect, it } from "vitest";
import type { AnalysisRun, MetricsSnapshot } from "@/lib/domain/assessment";
import { computeConfidence } from "./confidence";

const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function makeSnapshot(
  overrides: Partial<MetricsSnapshot> = {},
): MetricsSnapshot {
  return {
    description: "repo",
    stars: 700,
    forks: 100,
    avatarUrl: "https://example.com/avatar.png",
    htmlUrl: "https://github.com/acme/repo",
    license: "MIT",
    language: "TypeScript",
    repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
    isArchived: false,
    lastCommitAt: "2026-02-10T00:00:00.000Z",
    lastReleaseAt: "2026-01-15T00:00:00.000Z",
    lastClosedIssueAt: "2026-02-01T00:00:00.000Z",
    lastMergedPrAt: "2026-02-05T00:00:00.000Z",
    openIssuesPercent: 20,
    openIssuesCount: 20,
    closedIssuesCount: 80,
    medianIssueResolutionDays: 9,
    openPrsCount: 5,
    issuesCreatedLastYear: 14,
    commitsLast90Days: 12,
    mergedPrsLast90Days: 6,
    releases: [
      {
        tagName: "v1.4.0",
        name: "v1.4.0",
        publishedAt: "2026-01-15T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function makeRun(overrides: Partial<AnalysisRun> = {}): AnalysisRun {
  return {
    id: "run-1",
    repository: {
      id: "repo-1",
      owner: "acme",
      name: "repo",
      fullName: "acme/repo",
      defaultBranch: "main",
      createdAt: 0,
      updatedAt: 0,
    },
    status: "complete",
    metrics: makeSnapshot(),
    startedAt: NOW.getTime() - 2 * DAY_MS,
    completedAt: NOW.getTime() - 2 * DAY_MS,
    errorCode: null,
    errorMessage: null,
    ...overrides,
  };
}

describe("computeConfidence", () => {
  it("returns high confidence for complete, fresh data", () => {
    const result = computeConfidence(makeRun(), { now: NOW });

    expect(result.level).toBe("high");
    expect(result.score).toBe(100);
    expect(result.penalties).toHaveLength(0);
    expect(result.summary).toBeNull();
  });

  it("returns low confidence when metrics are null", () => {
    const result = computeConfidence(makeRun({ metrics: null }), { now: NOW });

    expect(result.level).toBe("low");
    expect(result.score).toBe(0);
    expect(result.penalties).toHaveLength(1);
    expect(result.penalties[0]!.id).toBe("no_metrics");
  });

  it("penalizes failed run status", () => {
    const result = computeConfidence(makeRun({ status: "failed" }), {
      now: NOW,
    });

    expect(result.level).toBe("medium");
    expect(result.score).toBe(60);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "run_failed", points: 40 }),
    );
  });

  it("penalizes partial run status", () => {
    const result = computeConfidence(makeRun({ status: "partial" }), {
      now: NOW,
    });

    expect(result.level).toBe("medium");
    expect(result.score).toBe(80);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "run_partial", points: 20 }),
    );
  });

  it("penalizes missing openIssuesPercent", () => {
    const result = computeConfidence(
      makeRun({ metrics: makeSnapshot({ openIssuesPercent: null }) }),
      { now: NOW },
    );

    expect(result.score).toBe(90);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({
        id: "missing_open_issues_percent",
        points: 10,
      }),
    );
  });

  it("penalizes missing medianIssueResolutionDays", () => {
    const result = computeConfidence(
      makeRun({
        metrics: makeSnapshot({ medianIssueResolutionDays: null }),
      }),
      { now: NOW },
    );

    expect(result.score).toBe(92);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "missing_median_resolution", points: 8 }),
    );
  });

  it("penalizes missing commit history", () => {
    const result = computeConfidence(
      makeRun({ metrics: makeSnapshot({ lastCommitAt: null }) }),
      { now: NOW },
    );

    expect(result.score).toBe(88);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "missing_commit_history", points: 12 }),
    );
  });

  it("penalizes no releases", () => {
    const result = computeConfidence(
      makeRun({ metrics: makeSnapshot({ releases: [] }) }),
      { now: NOW },
    );

    expect(result.score).toBe(92);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "no_releases", points: 8 }),
    );
  });

  it("does not penalize staleness within grace period", () => {
    const result = computeConfidence(
      makeRun({ completedAt: NOW.getTime() - 5 * DAY_MS }),
      { now: NOW },
    );

    expect(result.score).toBe(100);
    expect(result.penalties).toHaveLength(0);
  });

  it("applies partial staleness penalty at 15 days", () => {
    const result = computeConfidence(
      makeRun({ completedAt: NOW.getTime() - 15 * DAY_MS }),
      { now: NOW },
    );

    const stalenessPenalty = result.penalties.find(
      (p) => p.id === "stale_analysis",
    );
    expect(stalenessPenalty).toBeDefined();
    expect(stalenessPenalty!.points).toBeGreaterThan(0);
    expect(stalenessPenalty!.points).toBeLessThan(25);
  });

  it("applies maximum staleness penalty at 30+ days", () => {
    const result = computeConfidence(
      makeRun({ completedAt: NOW.getTime() - 45 * DAY_MS }),
      { now: NOW },
    );

    const stalenessPenalty = result.penalties.find(
      (p) => p.id === "stale_analysis",
    );
    expect(stalenessPenalty).toBeDefined();
    expect(stalenessPenalty!.points).toBe(25);
  });

  it("penalizes when merged PRs hit API limit", () => {
    const result = computeConfidence(
      makeRun({ metrics: makeSnapshot({ mergedPrsLast90Days: 100 }) }),
      { now: NOW },
    );

    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "merged_prs_capped", points: 8 }),
    );
  });

  it("penalizes when issues hit API limit", () => {
    const result = computeConfidence(
      makeRun({ metrics: makeSnapshot({ issuesCreatedLastYear: 100 }) }),
      { now: NOW },
    );

    expect(result.penalties).toContainEqual(
      expect.objectContaining({ id: "issues_capped", points: 8 }),
    );
  });

  it("compounds multiple penalties into medium confidence", () => {
    const result = computeConfidence(
      makeRun({
        status: "partial",
        metrics: makeSnapshot({
          openIssuesPercent: null,
          medianIssueResolutionDays: null,
        }),
      }),
      { now: NOW },
    );

    // partial (20) + missing open issues (10) + missing resolution (8) = 38 → score 62
    expect(result.level).toBe("medium");
    expect(result.score).toBe(62);
    expect(result.penalties).toHaveLength(3);
    expect(result.summary).toBe(
      "Score may be approximate due to multiple data gaps",
    );
  });

  it("clamps score to zero when penalties exceed 100", () => {
    const result = computeConfidence(
      makeRun({
        status: "failed",
        completedAt: NOW.getTime() - 45 * DAY_MS,
        metrics: makeSnapshot({
          openIssuesPercent: null,
          medianIssueResolutionDays: null,
          lastCommitAt: null,
          releases: [],
        }),
      }),
      { now: NOW },
    );

    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
  });

  it("returns single penalty reason as summary", () => {
    const result = computeConfidence(
      makeRun({ metrics: makeSnapshot({ lastCommitAt: null }) }),
      { now: NOW },
    );

    expect(result.summary).toBe("No commit history found");
  });

  it("uses startedAt when completedAt is null", () => {
    const result = computeConfidence(
      makeRun({
        startedAt: NOW.getTime() - 20 * DAY_MS,
        completedAt: null,
      }),
      { now: NOW },
    );

    const stalenessPenalty = result.penalties.find(
      (p) => p.id === "stale_analysis",
    );
    expect(stalenessPenalty).toBeDefined();
    expect(stalenessPenalty!.points).toBeGreaterThan(0);
  });
});
