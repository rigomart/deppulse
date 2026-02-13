import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  graphqlWithAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    api: vi.fn(),
  },
}));

vi.mock("./rate-limit", () => ({
  parseGraphQLRateLimit: vi.fn(),
}));

import { logger } from "@/lib/logger";
import { graphqlWithAuth } from "./client";
import { fetchRepoMetrics } from "./metrics";
import { parseGraphQLRateLimit } from "./rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-13T00:00:00.000Z"));
  vi.mocked(parseGraphQLRateLimit).mockReturnValue({
    cost: 3,
    rateLimit: {
      limit: 5000,
      remaining: 4997,
      resetAt: new Date("2026-02-13T01:00:00.000Z"),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchRepoMetrics", () => {
  it("maps basic metrics plus recent commit and merged PR counters", async () => {
    vi.mocked(graphqlWithAuth).mockResolvedValue({
      rateLimit: {
        limit: 5000,
        remaining: 4997,
        cost: 3,
        resetAt: "2026-02-13T01:00:00.000Z",
      },
      repository: {
        nameWithOwner: "acme/widget",
        description: "Widget tools",
        stargazerCount: 1200,
        forkCount: 120,
        url: "https://github.com/acme/widget",
        isArchived: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        licenseInfo: { spdxId: "MIT" },
        primaryLanguage: { name: "TypeScript" },
        owner: { avatarUrl: "https://example.com/avatar.png" },
        defaultBranchRef: {
          name: "main",
          target: {
            latestCommit: {
              nodes: [{ committedDate: "2026-02-10T00:00:00.000Z" }],
            },
            recentCommitHistory: {
              totalCount: 22,
            },
          },
        },
        latestRelease: { publishedAt: "2026-01-15T00:00:00.000Z" },
        releases: {
          nodes: [
            {
              tagName: "v1.2.0",
              name: "v1.2.0",
              publishedAt: "2026-01-15T00:00:00.000Z",
            },
          ],
        },
        openIssues: { totalCount: 10 },
        closedIssues: { totalCount: 90 },
        openPRs: { totalCount: 5 },
        lastMergedPR: {
          nodes: [{ mergedAt: "2026-02-01T00:00:00.000Z" }],
        },
        mergedPRsRecent: {
          nodes: [
            {
              mergedAt: "2026-02-01T00:00:00.000Z",
              updatedAt: "2026-02-01T00:00:00.000Z",
            },
            {
              mergedAt: "2025-12-20T00:00:00.000Z",
              updatedAt: "2025-12-20T00:00:00.000Z",
            },
            {
              mergedAt: "2025-10-01T00:00:00.000Z",
              updatedAt: "2025-10-01T00:00:00.000Z",
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
        recentIssues: {
          nodes: [
            {
              createdAt: "2026-01-01T00:00:00.000Z",
              closedAt: "2026-01-03T00:00:00.000Z",
              state: "CLOSED",
            },
            {
              createdAt: "2025-03-01T00:00:00.000Z",
              closedAt: null,
              state: "OPEN",
            },
          ],
        },
        readmeMd: { text: "# Widget" },
        readmeLower: null,
        readmeNoExt: null,
      },
    });

    const result = await fetchRepoMetrics("acme", "widget");

    expect(result.commitsLast90Days).toBe(22);
    expect(result.mergedPrsLast90Days).toBe(2);
    expect(result.openIssuesPercent).toBe(10);
    expect(result.lastMergedPrAt?.toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
    expect(parseGraphQLRateLimit).toHaveBeenCalledTimes(1);
    expect(logger.api).toHaveBeenCalled();
    expect(graphqlWithAuth).toHaveBeenCalledTimes(1);

    expect(graphqlWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("query RepoMetrics"),
      expect.objectContaining({
        owner: "acme",
        repo: "widget",
        recentActivitySince: expect.any(String),
      }),
    );
  });

  it("paginates merged PRs and counts only merges within 90 days", async () => {
    vi.mocked(graphqlWithAuth)
      .mockResolvedValueOnce({
        rateLimit: {
          limit: 5000,
          remaining: 4996,
          cost: 4,
          resetAt: "2026-02-13T01:00:00.000Z",
        },
        repository: {
          nameWithOwner: "acme/widget",
          description: "Widget tools",
          stargazerCount: 1200,
          forkCount: 120,
          url: "https://github.com/acme/widget",
          isArchived: false,
          createdAt: "2020-01-01T00:00:00.000Z",
          licenseInfo: { spdxId: "MIT" },
          primaryLanguage: { name: "TypeScript" },
          owner: { avatarUrl: "https://example.com/avatar.png" },
          defaultBranchRef: {
            name: "main",
            target: {
              latestCommit: {
                nodes: [{ committedDate: "2026-02-10T00:00:00.000Z" }],
              },
              recentCommitHistory: {
                totalCount: 22,
              },
            },
          },
          latestRelease: { publishedAt: "2026-01-15T00:00:00.000Z" },
          releases: {
            nodes: [
              {
                tagName: "v1.2.0",
                name: "v1.2.0",
                publishedAt: "2026-01-15T00:00:00.000Z",
              },
            ],
          },
          openIssues: { totalCount: 10 },
          closedIssues: { totalCount: 90 },
          openPRs: { totalCount: 5 },
          lastMergedPR: {
            nodes: [{ mergedAt: "2026-02-10T00:00:00.000Z" }],
          },
          mergedPRsRecent: {
            nodes: [
              {
                mergedAt: "2026-02-10T00:00:00.000Z",
                updatedAt: "2026-02-10T00:00:00.000Z",
              },
              {
                mergedAt: "2025-09-01T00:00:00.000Z",
                updatedAt: "2026-02-09T00:00:00.000Z",
              },
            ],
            pageInfo: {
              hasNextPage: true,
              endCursor: "cursor-1",
            },
          },
          recentIssues: {
            nodes: [
              {
                createdAt: "2026-01-01T00:00:00.000Z",
                closedAt: "2026-01-03T00:00:00.000Z",
                state: "CLOSED",
              },
            ],
          },
          readmeMd: { text: "# Widget" },
          readmeLower: null,
          readmeNoExt: null,
        },
      })
      .mockResolvedValueOnce({
        repository: {
          mergedPRsRecent: {
            nodes: [
              {
                mergedAt: "2026-01-20T00:00:00.000Z",
                updatedAt: "2026-01-20T00:00:00.000Z",
              },
              {
                mergedAt: "2025-11-20T00:00:00.000Z",
                updatedAt: "2025-11-20T00:00:00.000Z",
              },
              {
                mergedAt: "2025-10-01T00:00:00.000Z",
                updatedAt: "2025-10-01T00:00:00.000Z",
              },
            ],
            pageInfo: {
              hasNextPage: true,
              endCursor: "cursor-2",
            },
          },
        },
      });

    const result = await fetchRepoMetrics("acme", "widget");

    expect(result.mergedPrsLast90Days).toBe(3);
    expect(graphqlWithAuth).toHaveBeenCalledTimes(2);
    expect(graphqlWithAuth).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("query RepoMergedPrsPage"),
      {
        owner: "acme",
        repo: "widget",
        after: "cursor-1",
      },
    );
  });

  it("throws when repository is missing", async () => {
    vi.mocked(graphqlWithAuth).mockResolvedValue({
      rateLimit: {
        limit: 5000,
        remaining: 4999,
        cost: 1,
        resetAt: "2026-02-13T01:00:00.000Z",
      },
      repository: null,
    });

    await expect(fetchRepoMetrics("acme", "missing")).rejects.toThrow(
      "Repository acme/missing not found",
    );
  });
});
