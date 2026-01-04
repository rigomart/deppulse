import "server-only";

import { graphql } from "@octokit/graphql";
import { subDays } from "date-fns";

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
}

// GraphQL query to fetch all repository metrics in a single request
const REPO_METRICS_QUERY = `
  query RepoMetrics($owner: String!, $repo: String!, $since90Days: GitTimestamp!) {
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

      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }

      openPRs: pullRequests(states: OPEN) { totalCount }

      recentIssues: issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          createdAt
          closedAt
          state
        }
      }
    }
  }
`;

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
      target: {
        history: { nodes: Array<{ committedDate: string }> };
        recentHistory: { totalCount: number };
      };
    } | null;
    latestRelease: { publishedAt: string } | null;
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
  } | null;
}

const getDaysSince = (dateString: string): number => {
  return Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
};

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

  const data = await graphqlWithAuth<RepoMetricsGraphQLResponse>(
    REPO_METRICS_QUERY,
    { owner, repo, since90Days },
  );

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
  };
}
