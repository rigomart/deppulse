import type {
  CommitActivityWeek,
  MetricsSnapshot,
} from "../../src/lib/domain/assessment";

const MERGED_PRS_LIMIT = 100;
const RECENT_ISSUES_LIMIT = 100;
const README_MAX_BYTES = 50_000;
const RELEASES_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export const REPO_METRICS_QUERY = `
  query RepoMetrics(
    $owner: String!,
    $repo: String!,
    $commits30Since: GitTimestamp!,
    $commits90Since: GitTimestamp!,
    $commits365Since: GitTimestamp!
  ) {
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
            commitHistory30d: history(first: 1, since: $commits30Since) { totalCount }
            commitHistory90d: history(first: 1, since: $commits90Since) { totalCount }
            commitHistory365d: history(first: 1, since: $commits365Since) { totalCount }
          }
        }
      }
      latestRelease { publishedAt }
      releases(first: ${RELEASES_LIMIT}, orderBy: {field: CREATED_AT, direction: DESC}) {
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
      recentIssues: issues(first: ${RECENT_ISSUES_LIMIT}, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { createdAt closedAt state }
      }
      readmeMd: object(expression: "HEAD:README.md") { ... on Blob { text } }
      readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text } }
      readmeNoExt: object(expression: "HEAD:README") { ... on Blob { text } }
    }
  }
`;

export interface RepoMetricsGraphQLResponse {
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
        commitHistory30d: { totalCount: number };
        commitHistory90d: { totalCount: number };
        commitHistory365d: { totalCount: number };
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

export type QueryVariables = {
  owner: string;
  repo: string;
  commits30Since: string;
  commits90Since: string;
  commits365Since: string;
};

export function buildQueryVariables(
  owner: string,
  repo: string,
  now: number,
): QueryVariables & Record<string, string> {
  return {
    owner,
    repo,
    commits30Since: new Date(now - 30 * DAY_MS).toISOString(),
    commits90Since: new Date(now - 90 * DAY_MS).toISOString(),
    commits365Since: new Date(now - 365 * DAY_MS).toISOString(),
  };
}

export function buildSnapshotFromGraphQL(
  data: RepoMetricsGraphQLResponse,
  owner: string,
  repo: string,
  now: number,
): MetricsSnapshot {
  const r = data.repository;
  if (!r) {
    throw new Error(`Repository ${owner}/${repo} not found`);
  }

  const branchTarget = r.defaultBranchRef?.target;
  const latestCommitDate =
    branchTarget?.latestCommit?.nodes?.[0]?.committedDate;
  const commitsLast30Days = branchTarget?.commitHistory30d?.totalCount ?? 0;
  const commitsLast90Days = branchTarget?.commitHistory90d?.totalCount ?? 0;
  const commitsLast365Days = branchTarget?.commitHistory365d?.totalCount ?? 0;

  const releases = (r.releases?.nodes ?? []).map((rel) => ({
    tagName: rel.tagName,
    name: rel.name,
    publishedAt: rel.publishedAt,
  }));

  const openIssuesCount = r.openIssues.totalCount;
  const closedIssuesCount = r.closedIssues.totalCount;
  const totalIssues = openIssuesCount + closedIssuesCount;
  const openIssuesPercent =
    totalIssues > 0
      ? Math.round((openIssuesCount / totalIssues) * 100 * 10) / 10
      : null;

  const ninetyDaysAgoMs = now - 90 * DAY_MS;
  const mergedPrsLast90Days = (r.mergedPRsRecent?.nodes ?? []).filter(
    (pr) => new Date(pr.mergedAt).getTime() >= ninetyDaysAgoMs,
  ).length;

  const oneYearAgoMs = now - 365 * DAY_MS;
  const closedIssueResolutionDays: number[] = [];
  let issuesCreatedLastYear = 0;

  for (const issue of r.recentIssues?.nodes ?? []) {
    const createdAt = new Date(issue.createdAt).getTime();
    if (createdAt >= oneYearAgoMs) issuesCreatedLastYear++;
    if (issue.state === "CLOSED" && issue.closedAt) {
      const closedAt = new Date(issue.closedAt).getTime();
      if (closedAt >= oneYearAgoMs) {
        closedIssueResolutionDays.push(
          Math.floor((closedAt - createdAt) / DAY_MS),
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

  const readmeText =
    r.readmeMd?.text ?? r.readmeLower?.text ?? r.readmeNoExt?.text;

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
    commitsLast30Days,
    commitsLast90Days,
    commitsLast365Days,
    mergedPrsLast90Days,
    readmeContent: readmeText?.slice(0, README_MAX_BYTES) ?? null,
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

export interface RawCommitWeek {
  week: number;
  total: number;
  days: [number, number, number, number, number, number, number];
}

export function parseCommitActivityWeeks(data: unknown): RawCommitWeek[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (w): w is RawCommitWeek =>
      !!w &&
      typeof w === "object" &&
      typeof w.week === "number" &&
      typeof w.total === "number" &&
      Array.isArray(w.days) &&
      w.days.length === 7,
  );
}

export function mapWeeksToCommitActivity(
  weeks: RawCommitWeek[],
): CommitActivityWeek[] {
  return weeks.map((w) => ({
    weekStart: new Date(w.week * 1000).toISOString(),
    totalCommits: w.total,
    dailyBreakdown: w.days,
  }));
}

/**
 * GitHub returns 401/403/404/422 when commit stats are unavailable for a repo
 * (private, deleted, or rejected). Other status codes are treated as transient.
 */
export function classifyCommitActivityHttpError(
  httpStatus: number,
): "unavailable" | "transient" {
  return httpStatus === 401 ||
    httpStatus === 403 ||
    httpStatus === 404 ||
    httpStatus === 422
    ? "unavailable"
    : "transient";
}

function getMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
