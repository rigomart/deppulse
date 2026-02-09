import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisRun } from "@/lib/domain/assessment";
import {
  ensureAssessmentRunCompleted,
  ensureAssessmentRunStarted,
} from "./mutations";

vi.mock("@/lib/cache/analysis-cache", () => ({
  isAnalysisFresh: vi.fn(),
}));

vi.mock("@/lib/github", () => ({
  fetchCommitActivity: vi.fn(),
  fetchRepoMetrics: vi.fn(),
}));

vi.mock("@/lib/maintenance", () => ({
  calculateMaintenanceScore: vi.fn(),
}));

vi.mock("@/lib/persistence/analysis-run", () => ({
  createAssessmentRun: vi.fn(),
  findAssessmentRunById: vi.fn(),
  updateAssessmentRun: vi.fn(),
}));

vi.mock("@/lib/persistence/repository", () => ({
  upsertRepository: vi.fn(),
}));

vi.mock("./queries", () => ({
  findLatestAssessmentRunBySlug: vi.fn(),
}));

import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import { fetchCommitActivity, fetchRepoMetrics } from "@/lib/github";
import { calculateMaintenanceScore } from "@/lib/maintenance";
import {
  createAssessmentRun,
  findAssessmentRunById,
  updateAssessmentRun,
} from "@/lib/persistence/analysis-run";
import { upsertRepository } from "@/lib/persistence/repository";
import { findLatestAssessmentRunBySlug } from "./queries";

function makeRun(overrides: Partial<AnalysisRun> = {}): AnalysisRun {
  return {
    id: 1,
    repository: {
      id: 99,
      owner: "acme",
      name: "widget",
      fullName: "acme/widget",
      defaultBranch: "main",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    status: "metrics_fetched" as const,
    metrics: {
      description: "repo",
      stars: 10,
      forks: 5,
      avatarUrl: "https://example.com/avatar.png",
      htmlUrl: "https://github.com/acme/widget",
      license: "MIT",
      language: "TypeScript",
      repositoryCreatedAt: "2024-01-01T00:00:00.000Z",
      isArchived: false,
      lastCommitAt: "2024-02-01T00:00:00.000Z",
      lastReleaseAt: "2024-03-01T00:00:00.000Z",
      lastClosedIssueAt: "2024-04-01T00:00:00.000Z",
      openIssuesPercent: 20,
      openIssuesCount: 4,
      closedIssuesCount: 16,
      medianIssueResolutionDays: 3,
      openPrsCount: 2,
      issuesCreatedLastYear: 8,
      releases: [],
    },
    commitActivity: [],
    score: null,
    category: null,
    scoreBreakdown: null,
    startedAt: new Date("2024-01-01T00:00:00.000Z"),
    completedAt: null,
    errorCode: null,
    errorMessage: null,
    ...overrides,
  };
}

const sampleMetrics = {
  description: "repo",
  stars: 10,
  forks: 5,
  avatarUrl: "https://example.com/avatar.png",
  htmlUrl: "https://github.com/acme/widget",
  license: "MIT",
  language: "TypeScript",
  repositoryCreatedAt: new Date("2024-01-01T00:00:00.000Z"),
  isArchived: false,
  lastCommitAt: new Date("2024-02-01T00:00:00.000Z"),
  lastReleaseAt: new Date("2024-03-01T00:00:00.000Z"),
  lastClosedIssueAt: new Date("2024-04-01T00:00:00.000Z"),
  openIssuesPercent: 20,
  openIssuesCount: 4,
  closedIssuesCount: 16,
  medianIssueResolutionDays: 3,
  openPrsCount: 2,
  issuesCreatedLastYear: 8,
  commitActivity: [],
  releases: [],
  fullName: "acme/widget",
  defaultBranch: "main",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assessment mutations", () => {
  it("ensureAssessmentRunStarted returns latest run when it is fresh", async () => {
    const latest = makeRun();
    vi.mocked(findLatestAssessmentRunBySlug).mockResolvedValue(latest);
    vi.mocked(isAnalysisFresh).mockReturnValue(true);

    const result = await ensureAssessmentRunStarted("acme", "widget");

    expect(result).toEqual(latest);
    expect(fetchRepoMetrics).not.toHaveBeenCalled();
    expect(upsertRepository).not.toHaveBeenCalled();
    expect(createAssessmentRun).not.toHaveBeenCalled();
  });

  it("ensureAssessmentRunStarted fetches metrics and creates run when missing or stale", async () => {
    const created = makeRun();
    vi.mocked(findLatestAssessmentRunBySlug).mockResolvedValue(null);
    vi.mocked(fetchRepoMetrics).mockResolvedValue(sampleMetrics);
    vi.mocked(upsertRepository).mockResolvedValue({
      id: 99,
      owner: "acme",
      name: "widget",
      fullName: "acme/widget",
      defaultBranch: "main",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    vi.mocked(createAssessmentRun).mockResolvedValue(created);

    const result = await ensureAssessmentRunStarted("acme", "widget");

    expect(result).toEqual(created);
    expect(fetchRepoMetrics).toHaveBeenCalledWith("acme", "widget");
    expect(createAssessmentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 99,
        status: "metrics_fetched",
        score: null,
        category: null,
      }),
    );
  });

  it("ensureAssessmentRunCompleted returns run when already complete with score and commits", async () => {
    const complete = makeRun({
      status: "complete",
      score: 80,
      category: "healthy",
      commitActivity: [{ week: "2024-W01", commits: 2 }],
    });
    vi.mocked(findAssessmentRunById).mockResolvedValue(complete);

    const result = await ensureAssessmentRunCompleted("acme", "widget", 1);

    expect(result).toEqual(complete);
    expect(updateAssessmentRun).not.toHaveBeenCalled();
    expect(fetchCommitActivity).not.toHaveBeenCalled();
  });

  it("ensureAssessmentRunCompleted transitions to score_pending and writes completed score", async () => {
    const initial = makeRun({ status: "metrics_fetched", commitActivity: [] });
    const pending = makeRun({ status: "score_pending", commitActivity: [] });
    const complete = makeRun({
      status: "complete",
      score: 77,
      category: "moderate",
      scoreBreakdown: { maturityTier: "growing" },
      commitActivity: [{ week: "2024-W01", commits: 3 }],
      completedAt: new Date("2024-05-01T00:00:00.000Z"),
    });

    vi.mocked(findAssessmentRunById).mockResolvedValue(initial);
    vi.mocked(updateAssessmentRun)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(complete);
    vi.mocked(fetchCommitActivity).mockResolvedValue([
      { week: "2024-W01", commits: 3 },
    ]);
    vi.mocked(calculateMaintenanceScore).mockReturnValue({
      score: 77,
      category: "moderate",
      maturityTier: "growing",
    });

    const result = await ensureAssessmentRunCompleted("acme", "widget", 1);

    expect(result).toEqual(complete);
    expect(updateAssessmentRun).toHaveBeenNthCalledWith(1, 1, {
      status: "score_pending",
    });
    expect(updateAssessmentRun).toHaveBeenNthCalledWith(
      2,
      1,
      expect.objectContaining({
        status: "complete",
        score: 77,
        category: "moderate",
        scoreBreakdown: { maturityTier: "growing" },
      }),
    );
  });

  it("ensureAssessmentRunCompleted marks run as failed when commit activity fetch fails", async () => {
    const initial = makeRun({ status: "metrics_fetched", commitActivity: [] });
    const pending = makeRun({ status: "score_pending", commitActivity: [] });

    vi.mocked(findAssessmentRunById).mockResolvedValue(initial);
    vi.mocked(updateAssessmentRun)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({
        ...pending,
        status: "failed",
        errorMessage: "boom",
      });
    vi.mocked(fetchCommitActivity).mockRejectedValue(new Error("boom"));

    await expect(
      ensureAssessmentRunCompleted("acme", "widget", 1),
    ).rejects.toThrow("boom");

    expect(updateAssessmentRun).toHaveBeenNthCalledWith(1, 1, {
      status: "score_pending",
    });
    expect(updateAssessmentRun).toHaveBeenNthCalledWith(2, 1, {
      status: "failed",
      errorMessage: "boom",
    });
  });
});
