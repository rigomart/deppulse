import "server-only";

import { subYears } from "date-fns";
import { logger } from "../logger";
import { graphqlWithAuth } from "./client";
import { parseGraphQLRateLimit } from "./rate-limit";
import type { RepoMetrics, RepoMetricsGraphQLResponse } from "./types";

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
        name
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

      readmeMd: object(expression: "HEAD:README.md") {
        ... on Blob { text }
      }
      readmeLower: object(expression: "HEAD:readme.md") {
        ... on Blob { text }
      }
      readmeNoExt: object(expression: "HEAD:README") {
        ... on Blob { text }
      }
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

/**
 * Fetches repository metadata and computed metrics from GitHub using GraphQL.
 *
 * @remarks
 * Issue metrics (`issuesCreatedLastYear`, `medianIssueResolutionDays`) are based on
 * the 100 most recent issues. For high-activity repositories with >100 issues/year,
 * these metrics may be underestimated.
 *
 * @param owner - GitHub repository owner (user or organization)
 * @param repo - Repository name
 * @returns A `RepoMetrics` object containing repository metadata and computed metrics
 */
export async function fetchRepoMetrics(
  owner: string,
  repo: string,
): Promise<RepoMetrics> {
  const graphqlStartTime = Date.now();

  let data: RepoMetricsGraphQLResponse;
  try {
    data = await graphqlWithAuth<RepoMetricsGraphQLResponse>(
      REPO_METRICS_QUERY,
      { owner, repo },
    );
  } catch (error) {
    const graphqlDuration = Date.now() - graphqlStartTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.api({
      service: "GitHub",
      endpoint: `GraphQL RepoMetrics (${owner}/${repo}) - ERROR: ${errorMessage}`,
      durationMs: graphqlDuration,
    });
    throw error;
  }

  const graphqlDuration = Date.now() - graphqlStartTime;

  // Log GraphQL request with rate limit info
  const rateLimitInfo = parseGraphQLRateLimit(data.rateLimit);
  logger.api({
    service: "GitHub",
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
  const lastCommitAt = latestCommitDate ? new Date(latestCommitDate) : null;

  // Latest release date
  const lastReleaseAt = r.latestRelease?.publishedAt
    ? new Date(r.latestRelease.publishedAt)
    : null;

  // Release history for charts
  const releases = r.releases.nodes.map((release) => ({
    tagName: release.tagName,
    name: release.name,
    publishedAt: release.publishedAt,
  }));

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

  // Find the most recent closed issue
  const lastClosedIssueAt =
    r.recentIssues.nodes
      .filter(
        (issue): issue is typeof issue & { closedAt: string } =>
          issue.state === "CLOSED" && issue.closedAt !== null,
      )
      .map((issue) => new Date(issue.closedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    fullName: r.nameWithOwner,
    description: r.description,
    stars: r.stargazerCount,
    forks: r.forkCount,
    avatarUrl: r.owner.avatarUrl,
    htmlUrl: r.url,
    defaultBranch: r.defaultBranchRef?.name ?? null,
    license: r.licenseInfo?.spdxId ?? null,
    language: r.primaryLanguage?.name ?? null,
    repositoryCreatedAt: new Date(r.createdAt),
    isArchived: r.isArchived,
    lastCommitAt,
    lastReleaseAt,
    lastClosedIssueAt,
    openIssuesPercent,
    openIssuesCount,
    closedIssuesCount,
    medianIssueResolutionDays,
    openPrsCount,
    issuesCreatedLastYear,
    readmeContent:
      (r.readmeMd?.text ?? r.readmeLower?.text ?? r.readmeNoExt?.text)?.slice(
        0,
        50_000,
      ) ?? null,
    releases,
  };
}
