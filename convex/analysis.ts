import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
  COMMIT_ACTIVITY_MAX_ATTEMPTS,
  COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS,
} from "./_shared/constants";

// ---------------------------------------------------------------------------
// GitHub API helpers (self-contained, no imports from src/)
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

async function fetchGitHubGraphQL(
  token: string,
  owner: string,
  repo: string,
): Promise<MetricsSnapshot> {
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: REPO_METRICS_QUERY,
      variables: {
        owner,
        repo,
        recentActivitySince: ninetyDaysAgo,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `GitHub GraphQL API returned ${response.status}: ${await response.text()}`,
    );
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const r = json.data?.repository;
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
    (r.recentIssues?.nodes ?? [])
      .filter(
        (i: { state: string; closedAt: string | null }) =>
          i.state === "CLOSED" && i.closedAt,
      )
      .map((i: { closedAt: string }) => i.closedAt)
      .sort(
        (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime(),
      )[0] ?? null;

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
  token: string,
  owner: string,
  repo: string,
): Promise<CommitActivityApiResult> {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/commit_activity`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const normalizedStatus =
      response.status === 200 ||
      response.status === 202 ||
      response.status === 403 ||
      response.status === 404
        ? response.status
        : 500;

    if (normalizedStatus !== 200) {
      return { status: normalizedStatus, weeks: [] };
    }

    const payload: unknown = await response.json();
    const weeks = Array.isArray(payload)
      ? payload.filter(
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
  } catch {
    return { status: 500, weeks: [] };
  }
}

// ---------------------------------------------------------------------------
// Convex Actions
// ---------------------------------------------------------------------------

export const processRun = internalAction({
  args: { runId: v.id("analysisRuns") },
  handler: async (ctx, { runId }) => {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error("GITHUB_PAT env var is not set");

    // Read the run to get repository info
    const run = await ctx.runQuery(internal.analysisRuns.internalGetById, {
      runId,
    });
    if (!run) throw new Error(`Run ${runId} not found`);

    const { owner, name: project } = run.repository;

    try {
      // Step 1: Fetch GraphQL metrics
      await ctx.runMutation(internal.analysisRuns.updateRunState, {
        runId,
        status: "running",
        runState: "running",
        progressStep: "metrics",
      });

      const metricsSnapshot = await fetchGitHubGraphQL(token, owner, project);

      // Step 2: Save metrics and advance to commit_activity step
      await ctx.runMutation(internal.analysisRuns.updateRunState, {
        runId,
        status: "running",
        runState: "running",
        progressStep: "commit_activity",
        metricsJson: metricsSnapshot,
        attemptCount: 0,
      });

      // Step 3: Schedule commit activity fetch as a separate function
      await ctx.scheduler.runAfter(
        0,
        internal.analysis.fetchCommitActivityWithRetry,
        { runId, attempt: 1 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`processRun failed for ${owner}/${project}:`, message);

      await ctx.runMutation(internal.analysisRuns.finalizeRun, {
        runId,
        status: "failed",
        runState: "failed",
        errorCode: "metrics_fetch_failed",
        errorMessage: message.slice(0, 500),
      });
    }
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

    const run = await ctx.runQuery(internal.analysisRuns.internalGetById, {
      runId,
    });
    if (!run) return;

    const snapshot = run.metrics as MetricsSnapshot | null;
    if (!snapshot) return;

    const { owner, name: project } = run.repository;
    const result = await fetchCommitActivityRest(token, owner, project);
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
        errorMessage: "Commit history couldn't be loaded for this repository.",
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
  },
});
