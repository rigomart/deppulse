import { subDays, subYears } from "date-fns";
import { logger } from "@/lib/logger.core";
import { parseGraphQLRateLimit } from "./rate-limit";
import type { RepoMetrics, RepoMetricsGraphQLResponse } from "./types";

type GraphQLFn = <T>(
  query: string,
  variables: Record<string, unknown>,
) => Promise<T>;

const MERGED_PRS_LIMIT = 100;

const REPO_METRICS_QUERY = `
  query RepoMetrics($owner: String!, $repo: String!, $recentActivitySince: GitTimestamp!) {
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
            latestCommit: history(first: 1) {
              nodes { committedDate }
            }
            recentCommitHistory: history(first: 1, since: $recentActivitySince) {
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
      lastMergedPR: pullRequests(states: MERGED, first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { mergedAt }
      }
      mergedPRsRecent: pullRequests(states: MERGED, first: ${MERGED_PRS_LIMIT}, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { mergedAt }
      }

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

export async function fetchRepoMetrics(
  owner: string,
  repo: string,
  graphqlFn: GraphQLFn,
): Promise<RepoMetrics> {
  const graphqlStartTime = Date.now();
  const recentActivitySince = subDays(new Date(), 90);

  let data: RepoMetricsGraphQLResponse;
  try {
    data = await graphqlFn<RepoMetricsGraphQLResponse>(REPO_METRICS_QUERY, {
      owner,
      repo,
      recentActivitySince: recentActivitySince.toISOString(),
    });
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

  const latestCommitDate =
    r.defaultBranchRef?.target?.latestCommit?.nodes?.[0]?.committedDate;
  const lastCommitAt = latestCommitDate ? new Date(latestCommitDate) : null;
  const commitsLast90Days =
    r.defaultBranchRef?.target?.recentCommitHistory?.totalCount ?? 0;

  const lastReleaseAt = r.latestRelease?.publishedAt
    ? new Date(r.latestRelease.publishedAt)
    : null;

  const releases = r.releases.nodes.map((release) => ({
    tagName: release.tagName,
    name: release.name,
    publishedAt: release.publishedAt,
  }));

  const openIssuesCount = r.openIssues.totalCount;
  const closedIssuesCount = r.closedIssues.totalCount;
  const totalIssues = openIssuesCount + closedIssuesCount;
  const openIssuesPercent =
    totalIssues > 0
      ? Math.round((openIssuesCount / totalIssues) * 100 * 10) / 10
      : null;

  const openPrsCount = r.openPRs.totalCount;

  const lastMergedPrDate = r.lastMergedPR?.nodes?.[0]?.mergedAt;
  const lastMergedPrAt = lastMergedPrDate ? new Date(lastMergedPrDate) : null;
  const mergedPrsLast90Days = r.mergedPRsRecent.nodes.filter((pr) => {
    return new Date(pr.mergedAt).getTime() >= recentActivitySince.getTime();
  }).length;

  const oneYearAgo = subYears(new Date(), 1);
  const closedIssueResolutionDays: number[] = [];
  let issuesCreatedLastYear = 0;

  for (const issue of r.recentIssues.nodes) {
    const createdAt = new Date(issue.createdAt);

    if (createdAt >= oneYearAgo) {
      issuesCreatedLastYear++;
    }

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
    lastMergedPrAt,
    openIssuesPercent,
    openIssuesCount,
    closedIssuesCount,
    medianIssueResolutionDays,
    openPrsCount,
    issuesCreatedLastYear,
    commitsLast90Days,
    mergedPrsLast90Days,
    readmeContent:
      (r.readmeMd?.text ?? r.readmeLower?.text ?? r.readmeNoExt?.text)?.slice(
        0,
        50_000,
      ) ?? null,
    releases,
  };
}
