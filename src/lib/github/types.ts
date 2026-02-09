import type { RateLimit } from "../logger";

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
  openIssuesPercent: number | null;
  openIssuesCount: number;
  closedIssuesCount: number;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLastYear: number;
  readmeContent: string | null;
  // Historical data for charts (1 year)
  commitActivity: Array<{ week: string; commits: number }>;
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
    readmeMd: { text: string } | null;
    readmeLower: { text: string } | null;
    readmeNoExt: { text: string } | null;
  } | null;
}

// GitHub REST API response for commit activity stats
export interface CommitActivityStats {
  days: number[]; // Sun-Sat commit counts
  total: number;
  week: number; // Unix timestamp
}
