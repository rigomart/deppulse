import "server-only";

import { graphql } from "@octokit/graphql";
import { format, subYears } from "date-fns";
import { logger, parseGraphQLRateLimit, parseRestRateLimit } from "./logger";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_PAT}`,
  },
});

export interface RepoMetrics {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  avatarUrl: string;
  htmlUrl: string;
  license: string | null;
  language: string | null;
  repositoryCreatedAt: Date;
  isArchived: boolean;
  daysSinceLastCommit: number | null;
  commitsLastYear: number;
  daysSinceLastRelease: number | null;
  openIssuesPercent: number | null;
  openIssuesCount: number;
  closedIssuesCount: number;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLastYear: number;
  // Historical data for charts (1 year)
  commitActivity: Array<{ week: string; commits: number }>;
  releases: Array<{
    tagName: string;
    name: string | null;
    publishedAt: string;
  }>;
}

// GraphQL query to fetch all repository metrics in a single request
const REPO_METRICS_QUERY = `
  query RepoMetrics($owner: String!, $repo: String!) {
    rateLimit {
      limit
      remaining
      cost
      resetAt
    }
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
        target {
          ... on Commit {
            history(first: 1) {
              nodes { committedDate }
            }
          }
        }
      }

      latestRelease { publishedAt }

      releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          tagName
          name
          publishedAt
        }
      }

      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }

      openPRs: pullRequests(states: OPEN) { totalCount }

      # Fetch issues for activity chart and metrics (1 year)
      recentIssues: issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          createdAt
          closedAt
          state
        }
      }

      # Fetch recently closed issues to capture close events
      recentlyClosedIssues: issues(first: 100, states: CLOSED, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          createdAt
          closedAt
        }
      }
    }
  }
`;

interface RepoMetricsGraphQLResponse {
  rateLimit: {
    limit: number;
    remaining: number;
    cost: number;
    resetAt: string;
  };
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
      target: {
        history: { nodes: Array<{ committedDate: string }> };
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
    recentIssues: {
      nodes: Array<{
        createdAt: string;
        closedAt: string | null;
        state: "OPEN" | "CLOSED";
      }>;
    };
    recentlyClosedIssues: {
      nodes: Array<{
        createdAt: string;
        closedAt: string;
      }>;
    };
  } | null;
}

// GitHub REST API response for commit activity stats
interface CommitActivityStats {
  days: number[]; // Sun-Sat commit counts
  total: number;
  week: number; // Unix timestamp
}

const getDaysSince = (dateString: string): number => {
  return Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-flight request deduplication for commit activity
const commitActivityRequests = new Map<
  string,
  Promise<Array<{ week: string; commits: number }>>
>();

/**
 * Fetch commit activity stats from GitHub REST API.
 * Returns weekly commit counts for the last 52 weeks.
 *
 * GitHub returns 202 when stats are being computed in the background.
 * We retry with exponential backoff until data is ready.
 *
 * Uses in-memory deduplication to prevent duplicate requests during streaming.
 */
export function fetchCommitActivity(
  owner: string,
  repo: string,
): Promise<Array<{ week: string; commits: number }>> {
  const key = `${owner}/${repo}`;

  // Return existing in-flight request if one exists
  const existing = commitActivityRequests.get(key);
  if (existing) {
    return existing;
  }

  // Create new request and store it
  const request = fetchCommitActivityInternal(owner, repo).finally(() => {
    // Clean up after request completes
    commitActivityRequests.delete(key);
  });

  commitActivityRequests.set(key, request);
  return request;
}

async function fetchCommitActivityInternal(
  owner: string,
  repo: string,
): Promise<Array<{ week: string; commits: number }>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`;
  const endpoint = `REST /repos/${owner}/${repo}/stats/commit_activity`;
  const maxRetries = 3;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const durationMs = Date.now() - startTime;
    const rateLimit = parseRestRateLimit(response.headers);

    // 202 means GitHub is computing stats - retry after delay
    if (response.status === 202) {
      logger.githubApi({
        endpoint: `${endpoint} (computing, attempt ${attempt}/${maxRetries})`,
        durationMs,
        rateLimit,
      });

      if (attempt < maxRetries) {
        await sleep(delayMs); // 2s between retries
        continue;
      }
      return [];
    }

    if (!response.ok) {
      logger.githubApi({
        endpoint: `${endpoint} (${response.status})`,
        durationMs,
        rateLimit,
      });
      return [];
    }

    const stats = await response.json();

    if (!Array.isArray(stats)) {
      logger.githubApi({
        endpoint: `${endpoint} (invalid response)`,
        durationMs,
        rateLimit,
      });
      return [];
    }

    logger.githubApi({ endpoint, durationMs, rateLimit });

    return stats.map((stat: CommitActivityStats) => ({
      week: format(new Date(stat.week * 1000), "yyyy-MM-dd"),
      commits: stat.total,
    }));
  }

  return [];
}

const getMedian = (numbers: number[]): number | null => {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Fetches repository metadata and computed metrics from GitHub using GraphQL.
 *
 * @param owner - GitHub repository owner (user or organization)
 * @param repo - Repository name
 * @returns A `RepoMetrics` object containing repository metadata and computed metrics for maintenance scoring
 */
export async function fetchRepoMetrics(
  owner: string,
  repo: string,
): Promise<RepoMetrics> {
  // Only fetch GraphQL data here - commit activity is fetched separately
  // via streaming to avoid blocking page render on 202 retries
  const graphqlStartTime = Date.now();
  const data = await graphqlWithAuth<RepoMetricsGraphQLResponse>(
    REPO_METRICS_QUERY,
    { owner, repo },
  );
  const graphqlDuration = Date.now() - graphqlStartTime;

  // Log GraphQL request with rate limit info
  const rateLimitInfo = parseGraphQLRateLimit(data.rateLimit);
  logger.githubApi({
    endpoint: `GraphQL RepoMetrics (${owner}/${repo})`,
    durationMs: graphqlDuration,
    cost: rateLimitInfo?.cost,
    rateLimit: rateLimitInfo?.rateLimit,
  });

  if (!data.repository) {
    throw new Error(`Repository ${owner}/${repo} not found`);
  }

  const r = data.repository;

  // Extract latest commit date
  const latestCommitDate =
    r.defaultBranchRef?.target?.history?.nodes?.[0]?.committedDate;
  const daysSinceLastCommit = latestCommitDate
    ? getDaysSince(latestCommitDate)
    : null;

  // Commit activity is fetched separately via streaming charts
  // commitsLastYear will be updated when chart data is fetched
  const commitsLastYear = 0;

  // Latest release
  const daysSinceLastRelease = r.latestRelease?.publishedAt
    ? getDaysSince(r.latestRelease.publishedAt)
    : null;

  // Release history for charts
  const releases = r.releases.nodes.map((release) => ({
    tagName: release.tagName,
    name: release.name,
    publishedAt: release.publishedAt,
  }));

  // Issue activity is fetched separately via streaming charts (uses Search API)

  // Open issues percentage (exact counts)
  const openIssuesCount = r.openIssues.totalCount;
  const closedIssuesCount = r.closedIssues.totalCount;
  const totalIssues = openIssuesCount + closedIssuesCount;
  const openIssuesPercent =
    totalIssues > 0
      ? Math.round((openIssuesCount / totalIssues) * 100 * 10) / 10
      : null;

  // Open PRs (exact count)
  const openPrsCount = r.openPRs.totalCount;

  // Process recent issues for resolution time and velocity (1 year)
  const oneYearAgo = subYears(new Date(), 1);
  const closedIssueResolutionDays: number[] = [];
  let issuesCreatedLastYear = 0;

  for (const issue of r.recentIssues.nodes) {
    const createdAt = new Date(issue.createdAt);

    // Count issues created in last year
    if (createdAt >= oneYearAgo) {
      issuesCreatedLastYear++;
    }

    // Calculate resolution time for issues closed in last year
    if (issue.state === "CLOSED" && issue.closedAt) {
      const closedAt = new Date(issue.closedAt);
      if (closedAt >= oneYearAgo) {
        const resolutionDays = Math.floor(
          (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        closedIssueResolutionDays.push(resolutionDays);
      }
    }
  }

  const medianIssueResolutionDays = getMedian(closedIssueResolutionDays);

  return {
    fullName: r.nameWithOwner,
    description: r.description,
    stars: r.stargazerCount,
    forks: r.forkCount,
    avatarUrl: r.owner.avatarUrl,
    htmlUrl: r.url,
    license: r.licenseInfo?.spdxId ?? null,
    language: r.primaryLanguage?.name ?? null,
    repositoryCreatedAt: new Date(r.createdAt),
    isArchived: r.isArchived,
    daysSinceLastCommit,
    commitsLastYear,
    daysSinceLastRelease,
    openIssuesPercent,
    openIssuesCount,
    closedIssuesCount,
    medianIssueResolutionDays,
    openPrsCount,
    issuesCreatedLastYear,
    commitActivity: [], // Fetched separately via streaming charts
    releases,
  };
}
