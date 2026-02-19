import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import {
  COMMIT_ACTIVITY_MAX_ATTEMPTS,
  COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS,
} from "./_shared/constants";
import { triggerSource } from "./schema";

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

const MERGED_PRS_LIMIT = 100;

const REPO_METRICS_QUERY = `
  query RepoMetrics($owner: String!, $repo: String!, $recentActivitySince: GitTimestamp!) {
    rateLimit { limit remaining cost resetAt }
    repository(owner: $owner, name: $repo) {
      nameWithOwner
      description
      stargazerCount
      forkCount
      url
      isArchived
      createdAt
      licenseInfo { spdxId }
      primaryLanguage { name }
      owner { avatarUrl }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            latestCommit: history(first: 1) { nodes { committedDate } }
            recentCommitHistory: history(first: 1, since: $recentActivitySince) { totalCount }
          }
        }
      }
      latestRelease { publishedAt }
      releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { tagName name publishedAt }
      }
      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }
      openPRs: pullRequests(states: OPEN) { totalCount }
      lastMergedPR: pullRequests(states: MERGED, first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { mergedAt }
      }
      mergedPRsRecent: pullRequests(states: MERGED, first: ${MERGED_PRS_LIMIT}, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { mergedAt }
      }
      recentIssues: issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { createdAt closedAt state }
      }
      readmeMd: object(expression: "HEAD:README.md") { ... on Blob { text } }
      readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text } }
      readmeNoExt: object(expression: "HEAD:README") { ... on Blob { text } }
    }
  }
`;

function getMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface MetricsSnapshot {
  description: string | null;
  stars: number;
  forks: number;
  avatarUrl: string;
  htmlUrl: string;
  license: string | null;
  language: string | null;
  repositoryCreatedAt: string | null;
  isArchived: boolean;
  lastCommitAt: string | null;
  lastReleaseAt: string | null;
  lastClosedIssueAt: string | null;
  lastMergedPrAt: string | null;
  openIssuesPercent: number | null;
  openIssuesCount: number;
  closedIssuesCount: number;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLastYear: number;
  commitsLast90Days: number;
  mergedPrsLast90Days: number;
  releases: Array<{
    tagName: string;
    name: string | null;
    publishedAt: string;
  }>;
  readmeContent?: string | null;
  commitActivity?: {
    state: "pending" | "ready" | "failed";
    attempts: number;
    lastAttemptedAt: string | null;
    errorMessage: string | null;
    weekly: Array<{
      weekStart: string;
      totalCommits: number;
      dailyBreakdown: [number, number, number, number, number, number, number];
    }>;
  };
}

interface RepoMetricsGraphQLResponse {
  repository: {
    nameWithOwner: string;
    description: string | null;
    stargazerCount: number;
    forkCount: number;
    url: string;
    isArchived: boolean;
    createdAt: string;
    licenseInfo: { spdxId: string } | null;
    primaryLanguage: { name: string } | null;
    owner: { avatarUrl: string };
    defaultBranchRef: {
      name: string;
      target: {
        latestCommit: { nodes: Array<{ committedDate: string }> };
        recentCommitHistory: { totalCount: number };
      };
    } | null;
    latestRelease: { publishedAt: string } | null;
    releases: {
      nodes: Array<{
        tagName: string;
        name: string | null;
        publishedAt: string;
      }>;
    };
    openIssues: { totalCount: number };
    closedIssues: { totalCount: number };
    openPRs: { totalCount: number };
    lastMergedPR: { nodes: Array<{ mergedAt: string }> };
    mergedPRsRecent: { nodes: Array<{ mergedAt: string }> };
    recentIssues: {
      nodes: Array<{
        createdAt: string;
        closedAt: string | null;
        state: "OPEN" | "CLOSED";
      }>;
    };
    readmeMd: { text: string } | null;
    readmeLower: { text: string } | null;
    readmeNoExt: { text: string } | null;
  } | null;
}

async function fetchGitHubGraphQL(
  client: Octokit,
  owner: string,
  repo: string,
): Promise<MetricsSnapshot> {
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const data = await client.graphql<RepoMetricsGraphQLResponse>(
    REPO_METRICS_QUERY,
    { owner, repo, recentActivitySince: ninetyDaysAgo },
  );

  const r = data.repository;
  if (!r) {
    throw new Error(`Repository ${owner}/${repo} not found`);
  }

  const latestCommitDate =
    r.defaultBranchRef?.target?.latestCommit?.nodes?.[0]?.committedDate;
  const commitsLast90Days =
    r.defaultBranchRef?.target?.recentCommitHistory?.totalCount ?? 0;

  const releases = (r.releases?.nodes ?? []).map(
    (rel: { tagName: string; name: string | null; publishedAt: string }) => ({
      tagName: rel.tagName,
      name: rel.name,
      publishedAt: rel.publishedAt,
    }),
  );

  const openIssuesCount = r.openIssues.totalCount;
  const closedIssuesCount = r.closedIssues.totalCount;
  const totalIssues = openIssuesCount + closedIssuesCount;
  const openIssuesPercent =
    totalIssues > 0
      ? Math.round((openIssuesCount / totalIssues) * 100 * 10) / 10
      : null;

  const ninetyDaysAgoMs = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const mergedPrsLast90Days = (r.mergedPRsRecent?.nodes ?? []).filter(
    (pr: { mergedAt: string }) =>
      new Date(pr.mergedAt).getTime() >= ninetyDaysAgoMs,
  ).length;

  const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const closedIssueResolutionDays: number[] = [];
  let issuesCreatedLastYear = 0;

  for (const issue of r.recentIssues?.nodes ?? []) {
    const createdAt = new Date(issue.createdAt).getTime();
    if (createdAt >= oneYearAgoMs) issuesCreatedLastYear++;
    if (issue.state === "CLOSED" && issue.closedAt) {
      const closedAt = new Date(issue.closedAt).getTime();
      if (closedAt >= oneYearAgoMs) {
        closedIssueResolutionDays.push(
          Math.floor((closedAt - createdAt) / (1000 * 60 * 60 * 24)),
        );
      }
    }
  }

  const lastClosedIssueAt =
    r.recentIssues.nodes
      .filter(
        (i): i is typeof i & { closedAt: string } =>
          i.state === "CLOSED" && i.closedAt !== null,
      )
      .map((i) => i.closedAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    description: r.description,
    stars: r.stargazerCount,
    forks: r.forkCount,
    avatarUrl: r.owner.avatarUrl,
    htmlUrl: r.url,
    license: r.licenseInfo?.spdxId ?? null,
    language: r.primaryLanguage?.name ?? null,
    repositoryCreatedAt: r.createdAt ?? null,
    isArchived: r.isArchived,
    lastCommitAt: latestCommitDate ?? null,
    lastReleaseAt: r.latestRelease?.publishedAt ?? null,
    lastClosedIssueAt,
    lastMergedPrAt: r.lastMergedPR?.nodes?.[0]?.mergedAt ?? null,
    openIssuesPercent,
    openIssuesCount,
    closedIssuesCount,
    medianIssueResolutionDays: getMedian(closedIssueResolutionDays),
    openPrsCount: r.openPRs.totalCount,
    issuesCreatedLastYear,
    commitsLast90Days,
    mergedPrsLast90Days,
    readmeContent:
      (r.readmeMd?.text ?? r.readmeLower?.text ?? r.readmeNoExt?.text)?.slice(
        0,
        50_000,
      ) ?? null,
    releases,
    commitActivity: {
      state: "pending",
      attempts: 0,
      lastAttemptedAt: null,
      errorMessage: null,
      weekly: [],
    },
  };
}

interface CommitActivityApiResult {
  status: 200 | 202 | 403 | 404 | 500;
  weeks: Array<{
    week: number;
    total: number;
    days: [number, number, number, number, number, number, number];
  }>;
}

async function fetchCommitActivityRest(
  client: Octokit,
  owner: string,
  repo: string,
): Promise<CommitActivityApiResult> {
  try {
    const response = await client.request(
      "GET /repos/{owner}/{repo}/stats/commit_activity",
      { owner, repo },
    );

    if (response.status === 202) {
      return { status: 202, weeks: [] };
    }

    const weeks = Array.isArray(response.data)
      ? response.data.filter(
          (w): w is CommitActivityApiResult["weeks"][number] =>
            !!w &&
            typeof w === "object" &&
            typeof w.week === "number" &&
            typeof w.total === "number" &&
            Array.isArray(w.days) &&
            w.days.length === 7,
        )
      : [];

    return { status: 200, weeks };
  } catch (error) {
    if (error instanceof RequestError) {
      console.warn(
        `fetchCommitActivityRest: ${owner}/${repo} returned HTTP ${error.status}`,
      );
      const status =
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404 ||
        error.status === 422
          ? 403
          : 500;
      return { status, weeks: [] };
    }

    console.error(
      `fetchCommitActivityRest failed for ${owner}/${repo}:`,
      error instanceof Error ? error.message : String(error),
    );
    return { status: 500, weeks: [] };
  }
}

// ---------------------------------------------------------------------------
// Convex Actions
// ---------------------------------------------------------------------------

export const analyzeProject = action({
  args: {
    owner: v.string(),
    project: v.string(),
    triggerSource: v.optional(triggerSource),
  },
  handler: async (ctx, args): Promise<{ owner: string; project: string }> => {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error("GITHUB_PAT env var is not set");
    const client = new Octokit({ auth: token });

    const result = await ctx.runMutation(internal.analysisRuns.startOrReuse, {
      owner: args.owner,
      project: args.project,
      triggerSource: args.triggerSource,
    });

    if (result.alreadyComplete || result.alreadyActive) {
      return { owner: result.owner, project: result.project };
    }

    const { runId, owner, project } = result;

    try {
      await ctx.runMutation(internal.analysisRuns.updateRunState, {
        runId,
        status: "running",
        runState: "running",
        progressStep: "metrics",
      });

      const metricsSnapshot = await fetchGitHubGraphQL(client, owner, project);

      await ctx.runMutation(internal.analysisRuns.updateRunState, {
        runId,
        status: "running",
        runState: "running",
        progressStep: "commit_activity",
        metricsJson: metricsSnapshot,
        attemptCount: 0,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.analysis.fetchCommitActivityWithRetry,
        { runId, attempt: 1 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.analysisRuns.finalizeRun, {
        runId,
        status: "failed",
        runState: "failed",
        errorCode: "metrics_fetch_failed",
        errorMessage: message.slice(0, 500),
      });
      throw error;
    }

    return { owner, project };
  },
});

export const fetchCommitActivityWithRetry = internalAction({
  args: {
    runId: v.id("analysisRuns"),
    attempt: v.number(),
  },
  handler: async (ctx, { runId, attempt }) => {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error("GITHUB_PAT env var is not set");
    const client = new Octokit({ auth: token });

    const run = await ctx.runQuery(internal.analysisRuns.internalGetById, {
      runId,
    });
    if (!run) {
      console.warn(
        `fetchCommitActivityWithRetry: Run ${runId} not found, skipping`,
      );
      return;
    }

    const snapshot = run.metrics as MetricsSnapshot | null;
    if (!snapshot) {
      console.error(
        `fetchCommitActivityWithRetry: Run ${runId} has no metrics snapshot (state: ${run.runState})`,
      );
      await ctx.runMutation(internal.analysisRuns.finalizeRun, {
        runId,
        status: "failed",
        runState: "failed",
        errorCode: "missing_metrics_snapshot",
        errorMessage:
          "Internal error: metrics were not saved before commit activity fetch.",
      });
      return;
    }

    const { owner, name: project } = run.repository;

    try {
      const result = await fetchCommitActivityRest(client, owner, project);
      const now = new Date().toISOString();

      if (result.status === 200) {
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "ready",
            attempts: attempt,
            lastAttemptedAt: now,
            errorMessage: null,
            weekly: result.weeks.map((w) => ({
              weekStart: new Date(w.week * 1000).toISOString(),
              totalCommits: w.total,
              dailyBreakdown: w.days,
            })),
          },
        };

        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "complete",
          runState: "complete",
          metricsJson: updatedSnapshot,
        });
        return;
      }

      if (result.status === 403 || result.status === 404) {
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "failed",
            attempts: attempt,
            lastAttemptedAt: now,
            errorMessage: "Commit history isn't available for this repository.",
            weekly: [],
          },
        };

        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "partial",
          runState: "partial",
          metricsJson: updatedSnapshot,
          errorCode: "commit_activity_unavailable",
          errorMessage: "Commit history isn't available for this repository.",
        });
        return;
      }

      // 202 or transient error — retry or give up
      if (attempt >= COMMIT_ACTIVITY_MAX_ATTEMPTS) {
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "failed",
            attempts: attempt,
            lastAttemptedAt: now,
            errorMessage:
              "Commit history couldn't be loaded for this repository.",
            weekly: [],
          },
        };

        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "partial",
          runState: "partial",
          metricsJson: updatedSnapshot,
          errorCode: "commit_activity_retry_limit",
          errorMessage:
            "Commit history couldn't be loaded for this repository.",
        });
        return;
      }

      // Schedule retry
      const delaySeconds =
        COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS[attempt - 1] ?? 13;

      await ctx.runMutation(internal.analysisRuns.updateRunState, {
        runId,
        runState: "waiting_retry",
        attemptCount: attempt,
        metricsJson: {
          ...snapshot,
          commitActivity: {
            ...snapshot.commitActivity,
            state: "pending",
            attempts: attempt,
            lastAttemptedAt: now,
          },
        },
      });

      await ctx.scheduler.runAfter(
        delaySeconds * 1000,
        internal.analysis.fetchCommitActivityWithRetry,
        { runId, attempt: attempt + 1 },
      );
    } catch (error) {
      console.error(
        `fetchCommitActivityWithRetry: Unhandled error for run ${runId}, attempt ${attempt}:`,
        error instanceof Error ? error.message : String(error),
      );
      try {
        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "failed",
          runState: "failed",
          errorCode: "commit_activity_unhandled_error",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown error",
        });
      } catch (innerError) {
        console.error(
          `fetchCommitActivityWithRetry: Could not finalize run ${runId} after error:`,
          innerError,
        );
      }
    }
  },
});
