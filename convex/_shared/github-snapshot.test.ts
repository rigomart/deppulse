import { describe, expect, it } from "vitest";
import {
  buildQueryVariables,
  buildSnapshotFromGraphQL,
  classifyCommitActivityHttpError,
  mapWeeksToCommitActivity,
  parseCommitActivityWeeks,
  type RepoMetricsGraphQLResponse,
} from "./github-snapshot";

const NOW = new Date("2026-05-01T00:00:00.000Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (days: number) =>
  new Date(NOW - days * DAY_MS).toISOString();

function makeResponse(
  overrides: Partial<
    NonNullable<RepoMetricsGraphQLResponse["repository"]>
  > = {},
): RepoMetricsGraphQLResponse {
  return {
    repository: {
      nameWithOwner: "acme/widget",
      description: "A widget",
      stargazerCount: 100,
      forkCount: 10,
      url: "https://github.com/acme/widget",
      isArchived: false,
      createdAt: "2020-01-01T00:00:00Z",
      licenseInfo: { spdxId: "MIT" },
      primaryLanguage: { name: "TypeScript" },
      owner: { avatarUrl: "https://avatars/acme" },
      defaultBranchRef: {
        name: "main",
        target: {
          latestCommit: { nodes: [{ committedDate: isoDaysAgo(2) }] },
          commitHistory30d: { totalCount: 12 },
          commitHistory90d: { totalCount: 30 },
          commitHistory365d: { totalCount: 100 },
        },
      },
      latestRelease: { publishedAt: isoDaysAgo(40) },
      releases: { nodes: [] },
      openIssues: { totalCount: 5 },
      closedIssues: { totalCount: 95 },
      openPRs: { totalCount: 2 },
      lastMergedPR: { nodes: [{ mergedAt: isoDaysAgo(7) }] },
      mergedPRsRecent: { nodes: [] },
      recentIssues: { nodes: [] },
      readmeMd: null,
      readmeLower: null,
      readmeNoExt: null,
      ...overrides,
    },
  };
}

describe("buildQueryVariables", () => {
  it("computes ISO timestamps 30/90/365 days before `now`", () => {
    const vars = buildQueryVariables("acme", "widget", NOW);
    expect(vars.owner).toBe("acme");
    expect(vars.repo).toBe("widget");
    expect(vars.commits30Since).toBe(isoDaysAgo(30));
    expect(vars.commits90Since).toBe(isoDaysAgo(90));
    expect(vars.commits365Since).toBe(isoDaysAgo(365));
  });
});

describe("buildSnapshotFromGraphQL", () => {
  it("throws when the repository node is null", () => {
    expect(() =>
      buildSnapshotFromGraphQL({ repository: null }, "acme", "missing", NOW),
    ).toThrow("Repository acme/missing not found");
  });

  it("maps the basic repository fields", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse(),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.stars).toBe(100);
    expect(snapshot.forks).toBe(10);
    expect(snapshot.license).toBe("MIT");
    expect(snapshot.language).toBe("TypeScript");
    expect(snapshot.isArchived).toBe(false);
    expect(snapshot.lastCommitAt).toBe(isoDaysAgo(2));
    expect(snapshot.commitsLast30Days).toBe(12);
    expect(snapshot.commitsLast90Days).toBe(30);
    expect(snapshot.commitsLast365Days).toBe(100);
  });

  it("computes openIssuesPercent rounded to one decimal", () => {
    // 7 open / (7 + 13) = 35.0%
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        openIssues: { totalCount: 7 },
        closedIssues: { totalCount: 13 },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.openIssuesPercent).toBe(35);
  });

  it("returns null openIssuesPercent when no issues exist", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        openIssues: { totalCount: 0 },
        closedIssues: { totalCount: 0 },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.openIssuesPercent).toBeNull();
  });

  it("counts only PRs merged in the last 90 days", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        mergedPRsRecent: {
          nodes: [
            { mergedAt: isoDaysAgo(10) },
            { mergedAt: isoDaysAgo(50) },
            { mergedAt: isoDaysAgo(100) }, // outside 90d window
            { mergedAt: isoDaysAgo(200) }, // outside
          ],
        },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.mergedPrsLast90Days).toBe(2);
  });

  it("computes median issue resolution days from issues closed in the last year", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        recentIssues: {
          nodes: [
            // resolved in 5 days
            {
              createdAt: isoDaysAgo(15),
              closedAt: isoDaysAgo(10),
              state: "CLOSED",
            },
            // resolved in 20 days
            {
              createdAt: isoDaysAgo(30),
              closedAt: isoDaysAgo(10),
              state: "CLOSED",
            },
            // resolved in 100 days
            {
              createdAt: isoDaysAgo(120),
              closedAt: isoDaysAgo(20),
              state: "CLOSED",
            },
          ],
        },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.medianIssueResolutionDays).toBe(20);
  });

  it("ignores issues closed more than a year ago when computing median", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        recentIssues: {
          nodes: [
            {
              createdAt: isoDaysAgo(500),
              closedAt: isoDaysAgo(400),
              state: "CLOSED",
            },
          ],
        },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.medianIssueResolutionDays).toBeNull();
  });

  it("counts issues created within the last year", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        recentIssues: {
          nodes: [
            { createdAt: isoDaysAgo(10), closedAt: null, state: "OPEN" },
            { createdAt: isoDaysAgo(200), closedAt: null, state: "OPEN" },
            { createdAt: isoDaysAgo(400), closedAt: null, state: "OPEN" }, // outside year
          ],
        },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.issuesCreatedLastYear).toBe(2);
  });

  it("picks the most recent closedAt across the recentIssues list", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({
        recentIssues: {
          nodes: [
            {
              createdAt: isoDaysAgo(20),
              closedAt: isoDaysAgo(15),
              state: "CLOSED",
            },
            {
              createdAt: isoDaysAgo(30),
              closedAt: isoDaysAgo(2),
              state: "CLOSED",
            },
            { createdAt: isoDaysAgo(5), closedAt: null, state: "OPEN" },
          ],
        },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.lastClosedIssueAt).toBe(isoDaysAgo(2));
  });

  it("prefers README.md, falls back to readme.md, then to README", () => {
    const md = buildSnapshotFromGraphQL(
      makeResponse({
        readmeMd: { text: "# md" },
        readmeLower: { text: "# lower" },
        readmeNoExt: { text: "# noext" },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(md.readmeContent).toBe("# md");

    const lower = buildSnapshotFromGraphQL(
      makeResponse({
        readmeMd: null,
        readmeLower: { text: "# lower" },
        readmeNoExt: { text: "# noext" },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(lower.readmeContent).toBe("# lower");

    const noExt = buildSnapshotFromGraphQL(
      makeResponse({
        readmeMd: null,
        readmeLower: null,
        readmeNoExt: { text: "# noext" },
      }),
      "acme",
      "widget",
      NOW,
    );
    expect(noExt.readmeContent).toBe("# noext");

    const none = buildSnapshotFromGraphQL(
      makeResponse(),
      "acme",
      "widget",
      NOW,
    );
    expect(none.readmeContent).toBeNull();
  });

  it("truncates README content to 50,000 bytes", () => {
    const longText = "x".repeat(60_000);
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({ readmeMd: { text: longText } }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.readmeContent).toHaveLength(50_000);
  });

  it("initializes commitActivity in 'pending' state", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse(),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.commitActivity).toEqual({
      state: "pending",
      attempts: 0,
      lastAttemptedAt: null,
      errorMessage: null,
      weekly: [],
    });
  });

  it("defaults commit counts to 0 when defaultBranchRef is null (empty repo)", () => {
    const snapshot = buildSnapshotFromGraphQL(
      makeResponse({ defaultBranchRef: null }),
      "acme",
      "widget",
      NOW,
    );
    expect(snapshot.commitsLast30Days).toBe(0);
    expect(snapshot.commitsLast90Days).toBe(0);
    expect(snapshot.commitsLast365Days).toBe(0);
    expect(snapshot.lastCommitAt).toBeNull();
  });
});

describe("parseCommitActivityWeeks", () => {
  it("returns an empty array when input is not an array", () => {
    expect(parseCommitActivityWeeks(null)).toEqual([]);
    expect(parseCommitActivityWeeks({})).toEqual([]);
    expect(parseCommitActivityWeeks("data")).toEqual([]);
  });

  it("filters out malformed week entries", () => {
    const result = parseCommitActivityWeeks([
      { week: 1700000000, total: 5, days: [1, 1, 1, 1, 0, 0, 1] },
      { week: 1700000000, total: 5, days: [1, 2, 3] }, // wrong length
      null,
      { week: "x", total: 5, days: [1, 1, 1, 1, 1, 1, 1] }, // wrong type
      { week: 1700100000, total: 0, days: [0, 0, 0, 0, 0, 0, 0] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].week).toBe(1700000000);
    expect(result[1].total).toBe(0);
  });
});

describe("mapWeeksToCommitActivity", () => {
  it("converts unix-second weeks to ISO weekStart and copies counts", () => {
    const result = mapWeeksToCommitActivity([
      { week: 1700000000, total: 7, days: [1, 1, 1, 1, 1, 1, 1] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].weekStart).toBe(new Date(1700000000 * 1000).toISOString());
    expect(result[0].totalCommits).toBe(7);
    expect(result[0].dailyBreakdown).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("classifyCommitActivityHttpError", () => {
  it("treats 401/403/404/422 as 'unavailable'", () => {
    expect(classifyCommitActivityHttpError(401)).toBe("unavailable");
    expect(classifyCommitActivityHttpError(403)).toBe("unavailable");
    expect(classifyCommitActivityHttpError(404)).toBe("unavailable");
    expect(classifyCommitActivityHttpError(422)).toBe("unavailable");
  });

  it("treats other status codes as 'transient'", () => {
    expect(classifyCommitActivityHttpError(500)).toBe("transient");
    expect(classifyCommitActivityHttpError(502)).toBe("transient");
    expect(classifyCommitActivityHttpError(429)).toBe("transient");
  });
});
