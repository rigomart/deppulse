import type { RateLimit } from "@/lib/logger.core";

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

export interface CommitActivityWeekResponse {
  week: number;
  total: number;
  days: [number, number, number, number, number, number, number];
}

export interface CommitActivityResult {
  status: 200 | 202 | 403 | 404 | 500;
  weeks: CommitActivityWeekResponse[];
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
    mergedPRsRecent: {
      nodes: Array<{ mergedAt: string }>;
    };
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
