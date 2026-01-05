import "server-only";

import { graphql } from "@octokit/graphql";
import { format, startOfWeek, subDays, subYears } from "date-fns";
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
  commitsLast90Days: number;
  daysSinceLastRelease: number | null;
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLast90Days: number;
  // Historical data for charts
  commitActivity: Array<{ week: string; commits: number }>;
  issueActivity: Array<{ week: string; opened: number; closed: number }>;
  releases: Array<{
    tagName: string;
    name: string | null;
    publishedAt: string;
  }>;
}

// GraphQL query to fetch all repository metrics in a single request
const REPO_METRICS_QUERY = `
  query RepoMetrics($owner: String!, $repo: String!, $since90Days: GitTimestamp!) {
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
            recentHistory: history(since: $since90Days) {
              totalCount
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

      # Fetch more issues to build activity chart (last 200 most recent)
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
        recentHistory: { totalCount: number };
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

/**
 * Fetch commit activity stats from GitHub REST API.
 * Returns weekly commit counts for the last 52 weeks.
 */
async function fetchCommitActivity(
  owner: string,
  repo: string,
): Promise<Array<{ week: string; commits: number }>> {
  const startTime = Date.now();
  const endpoint = `REST /repos/${owner}/${repo}/stats/commit_activity`;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  const durationMs = Date.now() - startTime;
  const rateLimit = parseRestRateLimit(response.headers);

  // Stats API returns 202 when computing stats (not ready yet)
  // Also handle other non-success cases
  if (!response.ok || response.status === 202) {
    logger.githubApi({
      endpoint: `${endpoint} (${response.status === 202 ? "computing" : response.status})`,
      durationMs,
      rateLimit,
    });
    return [];
  }

  const stats = await response.json();

  // Validate response is an array (can be empty object in some cases)
  if (!Array.isArray(stats)) {
    logger.githubApi({
      endpoint: `${endpoint} (invalid response)`,
      durationMs,
      rateLimit,
    });
    return [];
  }

  logger.githubApi({
    endpoint,
    durationMs,
    rateLimit,
  });

  // Transform to our format (week timestamp -> date string)
  return stats.map((stat: CommitActivityStats) => ({
    week: format(new Date(stat.week * 1000), "yyyy-MM-dd"),
    commits: stat.total,
  }));
}

/**
 * Aggregates issues by week for the activity chart.
 * Returns opened and closed counts per week for the last 52 weeks.
 */
function buildIssueActivity(
  recentIssues: Array<{
    createdAt: string;
    closedAt: string | null;
    state: "OPEN" | "CLOSED";
  }>,
  recentlyClosedIssues: Array<{ createdAt: string; closedAt: string }>,
): Array<{ week: string; opened: number; closed: number }> {
  const oneYearAgo = subYears(new Date(), 1);
  const weekMap = new Map<string, { opened: number; closed: number }>();

  // Initialize last 52 weeks
  for (let i = 0; i < 52; i++) {
    const weekDate = subDays(new Date(), i * 7);
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
    const key = format(weekStart, "yyyy-MM-dd");
    weekMap.set(key, { opened: 0, closed: 0 });
  }

  // Count issues opened per week
  for (const issue of recentIssues) {
    const createdAt = new Date(issue.createdAt);
    if (createdAt >= oneYearAgo) {
      const weekStart = startOfWeek(createdAt, { weekStartsOn: 0 });
      const key = format(weekStart, "yyyy-MM-dd");
      const existing = weekMap.get(key);
      if (existing) {
        existing.opened++;
      }
    }
  }

  // Count issues closed per week from both sources
  const closedIssues = [
    ...recentIssues.filter((i) => i.closedAt).map((i) => i.closedAt as string),
    ...recentlyClosedIssues.map((i) => i.closedAt),
  ];

  // Deduplicate by using Set
  const uniqueClosedDates = new Set(closedIssues);

  for (const closedAt of uniqueClosedDates) {
    const closedDate = new Date(closedAt);
    if (closedDate >= oneYearAgo) {
      const weekStart = startOfWeek(closedDate, { weekStartsOn: 0 });
      const key = format(weekStart, "yyyy-MM-dd");
      const existing = weekMap.get(key);
      if (existing) {
        existing.closed++;
      }
    }
  }

  // Convert to sorted array
  return Array.from(weekMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week));
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
  const since90Days = subDays(new Date(), 90).toISOString();

  // Run GraphQL and REST API calls in parallel
  const graphqlStartTime = Date.now();
  const [data, commitActivity] = await Promise.all([
    graphqlWithAuth<RepoMetricsGraphQLResponse>(REPO_METRICS_QUERY, {
      owner,
      repo,
      since90Days,
    }),
    fetchCommitActivity(owner, repo),
  ]);
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

  // Commits in last 90 days (exact count via totalCount)
  const commitsLast90Days =
    r.defaultBranchRef?.target?.recentHistory?.totalCount ?? 0;

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

  // Build issue activity chart data
  const issueActivity = buildIssueActivity(
    r.recentIssues.nodes,
    r.recentlyClosedIssues.nodes,
  );

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

  // Process recent issues for resolution time and velocity
  const ninetyDaysAgo = subDays(new Date(), 90);
  const sixMonthsAgo = subDays(new Date(), 180);
  const closedIssueResolutionDays: number[] = [];
  let issuesCreatedLast90Days = 0;

  for (const issue of r.recentIssues.nodes) {
    const createdAt = new Date(issue.createdAt);

    // Count issues created in last 90 days
    if (createdAt >= ninetyDaysAgo) {
      issuesCreatedLast90Days++;
    }

    // Calculate resolution time for recently closed issues
    if (issue.state === "CLOSED" && issue.closedAt) {
      const closedAt = new Date(issue.closedAt);
      if (closedAt >= sixMonthsAgo) {
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
    commitsLast90Days,
    daysSinceLastRelease,
    openIssuesPercent,
    medianIssueResolutionDays,
    openPrsCount,
    issuesCreatedLast90Days,
    commitActivity,
    issueActivity,
    releases,
  };
}
