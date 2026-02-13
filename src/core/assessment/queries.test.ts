import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findLatestAssessmentRunBySlug,
  listAssessmentRunHistoryBySlug,
  listRecentCompletedAssessments,
} from "./queries";

vi.mock("@/adapters/persistence/analysis-run", () => ({
  findLatestAssessmentRunByRepositoryId: vi.fn(),
  listRecentCompletedAssessmentRuns: vi.fn(),
  listAssessmentRunsByRepositoryId: vi.fn(),
}));

vi.mock("@/adapters/persistence/repository", () => ({
  findRepositoryByFullName: vi.fn(),
}));

import {
  findLatestAssessmentRunByRepositoryId,
  listAssessmentRunsByRepositoryId,
  listRecentCompletedAssessmentRuns,
} from "@/adapters/persistence/analysis-run";
import { findRepositoryByFullName } from "@/adapters/persistence/repository";

function makeRun(id: number, repositoryId: number) {
  return {
    id,
    repository: {
      id: repositoryId,
      owner: `owner-${repositoryId}`,
      name: `repo-${repositoryId}`,
      fullName: `owner-${repositoryId}/repo-${repositoryId}`,
      defaultBranch: "main",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    status: "complete" as const,
    metrics: null,
    startedAt: new Date("2024-01-01T00:00:00.000Z"),
    completedAt: new Date("2024-01-01T00:00:00.000Z"),
    errorCode: null,
    errorMessage: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assessment queries", () => {
  it("findLatestAssessmentRunBySlug returns null when repository does not exist", async () => {
    vi.mocked(findRepositoryByFullName).mockResolvedValue(null);

    const result = await findLatestAssessmentRunBySlug("acme", "missing");

    expect(result).toBeNull();
    expect(findLatestAssessmentRunByRepositoryId).not.toHaveBeenCalled();
  });

  it("listAssessmentRunHistoryBySlug returns [] when repository does not exist", async () => {
    vi.mocked(findRepositoryByFullName).mockResolvedValue(null);

    const result = await listAssessmentRunHistoryBySlug("acme", "missing", 10);

    expect(result).toEqual([]);
    expect(listAssessmentRunsByRepositoryId).not.toHaveBeenCalled();
  });

  it("listRecentCompletedAssessments returns unique repositories and respects limit", async () => {
    vi.mocked(listRecentCompletedAssessmentRuns).mockResolvedValue([
      makeRun(1, 10),
      makeRun(2, 10),
      makeRun(3, 11),
      makeRun(4, 12),
    ]);

    const result = await listRecentCompletedAssessments(2);

    expect(listRecentCompletedAssessmentRuns).toHaveBeenCalledWith(8);
    expect(result).toHaveLength(2);
    expect(result[0]?.repository.id).toBe(10);
    expect(result[1]?.repository.id).toBe(11);
  });
});
