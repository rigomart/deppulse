import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { ensureAssessmentRunStarted } from "./mutations";

vi.mock("@/lib/cache/analysis-cache", () => ({
  isAnalysisFresh: vi.fn(),
}));

vi.mock("@/lib/github", () => ({
  fetchRepoMetrics: vi.fn(),
}));

vi.mock("@/lib/persistence/analysis-run", () => ({
  createAssessmentRun: vi.fn(),
}));

vi.mock("@/lib/persistence/repository", () => ({
  upsertRepository: vi.fn(),
}));

vi.mock("./queries", () => ({
  findLatestAssessmentRunBySlug: vi.fn(),
}));

import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import { fetchRepoMetrics } from "@/lib/github";
import { createAssessmentRun } from "@/lib/persistence/analysis-run";
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
    status: "complete" as const,
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
      lastMergedPrAt: "2024-03-15T00:00:00.000Z",
      openIssuesPercent: 20,
      openIssuesCount: 4,
      closedIssuesCount: 16,
      medianIssueResolutionDays: 3,
      openPrsCount: 2,
      issuesCreatedLastYear: 8,
      releases: [],
    },
    startedAt: new Date("2024-01-01T00:00:00.000Z"),
    completedAt: new Date("2024-01-01T00:00:00.000Z"),
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
  lastMergedPrAt: new Date("2024-03-15T00:00:00.000Z"),
  openIssuesPercent: 20,
  openIssuesCount: 4,
  closedIssuesCount: 16,
  medianIssueResolutionDays: 3,
  openPrsCount: 2,
  issuesCreatedLastYear: 8,
  releases: [],
  readmeContent: null,
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

  it("ensureAssessmentRunStarted fetches metrics and creates complete run when missing or stale", async () => {
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
        status: "complete",
        metrics: expect.objectContaining({
          stars: 10,
          forks: 5,
        }),
      }),
    );
  });
});
