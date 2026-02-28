import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeConfidence } from "./confidence";
import type { ConfidenceInput } from "./types";

const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const defaultMetrics: ConfidenceInput["metrics"] & object = {
  openIssuesPercent: 20,
  medianIssueResolutionDays: 9,
  lastCommitAt: "2026-02-10T00:00:00.000Z",
  releases: [{}, {}, {}],
  mergedPrsLast90Days: 6,
  issuesCreatedLastYear: 14,
};

const defaults: ConfidenceInput = {
  status: "complete",
  startedAt: NOW.getTime() - 2 * DAY_MS,
  completedAt: NOW.getTime() - 2 * DAY_MS,
  metrics: defaultMetrics,
};

function makeInput(overrides: Partial<ConfidenceInput> = {}): ConfidenceInput {
  return { ...defaults, ...overrides };
}

function hasPenalty(input: ConfidenceInput, id: string): boolean {
  return computeConfidence(input).penalties.some((p) => p.id === id);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("computeConfidence", () => {
  describe("penalty triggers", () => {
    it("trusts complete, fresh analysis", () => {
      const result = computeConfidence(makeInput());
      expect(result.penalties).toHaveLength(0);
    });

    it("doubts a failed analysis", () => {
      expect(hasPenalty(makeInput({ status: "failed" }), "run_failed")).toBe(
        true,
      );
    });

    it("doubts a partially completed analysis", () => {
      expect(hasPenalty(makeInput({ status: "partial" }), "run_partial")).toBe(
        true,
      );
    });

    it("doubts missing issue health data", () => {
      expect(
        hasPenalty(
          makeInput({
            metrics: { ...defaultMetrics, openIssuesPercent: null },
          }),
          "missing_open_issues_percent",
        ),
      ).toBe(true);
    });

    it("doubts missing issue resolution times", () => {
      expect(
        hasPenalty(
          makeInput({
            metrics: { ...defaultMetrics, medianIssueResolutionDays: null },
          }),
          "missing_median_resolution",
        ),
      ).toBe(true);
    });

    it("doubts missing commit history", () => {
      expect(
        hasPenalty(
          makeInput({ metrics: { ...defaultMetrics, lastCommitAt: null } }),
          "missing_commit_history",
        ),
      ).toBe(true);
    });

    it("doubts a project with no releases", () => {
      expect(
        hasPenalty(
          makeInput({ metrics: { ...defaultMetrics, releases: [] } }),
          "no_releases",
        ),
      ).toBe(true);
    });

    it("doubts possibly incomplete PR data", () => {
      expect(
        hasPenalty(
          makeInput({
            metrics: { ...defaultMetrics, mergedPrsLast90Days: 100 },
          }),
          "merged_prs_capped",
        ),
      ).toBe(true);
    });

    it("doubts possibly sampled issue data", () => {
      expect(
        hasPenalty(
          makeInput({
            metrics: { ...defaultMetrics, issuesCreatedLastYear: 100 },
          }),
          "issues_capped",
        ),
      ).toBe(true);
    });
  });

  describe("staleness", () => {
    it("trusts recent analysis", () => {
      expect(
        hasPenalty(
          makeInput({ completedAt: NOW.getTime() - 5 * DAY_MS }),
          "stale_analysis",
        ),
      ).toBe(false);
    });

    it("trusts older analysis less", () => {
      const at15 = computeConfidence(
        makeInput({ completedAt: NOW.getTime() - 15 * DAY_MS }),
      );
      const at25 = computeConfidence(
        makeInput({ completedAt: NOW.getTime() - 25 * DAY_MS }),
      );

      expect(at15.score).toBeLessThan(100);
      expect(at25.score).toBeLessThan(at15.score);
    });

    it("stops degrading confidence after a certain age", () => {
      const at45 = computeConfidence(
        makeInput({ completedAt: NOW.getTime() - 45 * DAY_MS }),
      );
      const at90 = computeConfidence(
        makeInput({ completedAt: NOW.getTime() - 90 * DAY_MS }),
      );

      expect(at45.score).toBe(at90.score);
    });

    it("measures age from when analysis started if it never finished", () => {
      expect(
        hasPenalty(
          makeInput({
            startedAt: NOW.getTime() - 20 * DAY_MS,
            completedAt: null,
          }),
          "stale_analysis",
        ),
      ).toBe(true);
    });
  });

  describe("score and level", () => {
    it("gives full confidence to healthy, fresh data", () => {
      const result = computeConfidence(makeInput());
      expect(result.level).toBe("high");
      expect(result.score).toBe(100);
    });

    it("gives no confidence without any data", () => {
      const result = computeConfidence(makeInput({ metrics: null }));
      expect(result.level).toBe("low");
      expect(result.score).toBe(0);
    });

    it("loses more confidence as data gaps accumulate", () => {
      const one = computeConfidence(
        makeInput({ metrics: { ...defaultMetrics, lastCommitAt: null } }),
      );
      const two = computeConfidence(
        makeInput({
          metrics: {
            ...defaultMetrics,
            lastCommitAt: null,
            releases: [],
          },
        }),
      );

      expect(one.score).toBeLessThan(100);
      expect(two.score).toBeLessThan(one.score);
    });

    it("never goes below zero", () => {
      const result = computeConfidence(
        makeInput({
          status: "failed",
          completedAt: NOW.getTime() - 45 * DAY_MS,
          metrics: {
            ...defaultMetrics,
            openIssuesPercent: null,
            medianIssueResolutionDays: null,
            lastCommitAt: null,
            releases: [],
          },
        }),
      );

      expect(result.score).toBe(0);
      expect(result.level).toBe("low");
    });
  });

  describe("summary", () => {
    it("says nothing when confidence is full", () => {
      const result = computeConfidence(makeInput());
      expect(result.summary).toBeNull();
    });

    it("explains the issue when there is one problem", () => {
      const result = computeConfidence(
        makeInput({ metrics: { ...defaultMetrics, lastCommitAt: null } }),
      );
      expect(result.summary).toBe("No commit history found");
    });

    it("gives a general warning when there are multiple problems", () => {
      const result = computeConfidence(
        makeInput({
          status: "partial",
          metrics: { ...defaultMetrics, openIssuesPercent: null },
        }),
      );
      expect(result.summary).toBe(
        "Score may be approximate due to multiple data gaps",
      );
    });
  });
});
