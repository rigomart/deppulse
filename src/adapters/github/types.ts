import type { RateLimit } from "@/lib/logger";

export type { RateLimit };

export interface RepoMetrics {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  avatarUrl: string;
  htmlUrl: string;
  defaultBranch: string | null;
  license: string | null;
  language: string | null;
  repositoryCreatedAt: Date;
  isArchived: boolean;
  lastCommitAt: Date | null;
  lastReleaseAt: Date | null;
  lastClosedIssueAt: Date | null;
  lastMergedPrAt: Date | null;
  openIssuesPercent: number | null;
  openIssuesCount: number;
  closedIssuesCount: number;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLastYear: number;
  commitsLast90Days: number;
  mergedPrsLast90Days: number;
  readmeContent: string | null;
  releases: Array<{
    tagName: string;
    name: string | null;
    publishedAt: string;
  }>;
}

// GraphQL rate limit response shape
export interface GraphQLRateLimitResponse {
  limit: number;
  remaining: number;
  cost: number;
  resetAt: string;
}

export interface PullRequestPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface MergedPullRequestNode {
  mergedAt: string;
  updatedAt: string;
}

export interface MergedPullRequestsConnection {
  nodes: MergedPullRequestNode[];
  pageInfo: PullRequestPageInfo;
}

export interface RepoMetricsGraphQLResponse {
  rateLimit: GraphQLRateLimitResponse;
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
    lastMergedPR: {
      nodes: Array<{ mergedAt: string }>;
    };
    mergedPRsRecent: MergedPullRequestsConnection;
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

export interface MergedPrsPageGraphQLResponse {
  repository: {
    mergedPRsRecent: MergedPullRequestsConnection;
  } | null;
}
