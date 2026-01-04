import "server-only";

import { subDays } from "date-fns";
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
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
 * Fetches repository metadata and computed metrics from GitHub for the specified owner and repository.
 *
 * @param owner - GitHub repository owner (user or organization)
 * @param repo - Repository name
 * @returns A `RepoMetrics` object containing repository metadata and computed metrics for maintenance scoring
 */
export async function fetchRepoMetrics(
  owner: string,
  repo: string,
): Promise<RepoMetrics> {
  const ninetyDaysAgoIso = subDays(new Date(), 90).toISOString();

  const [
    repoInfo,
    commits,
    release,
    closedIssues,
    openIssues,
    pulls,
    recentIssues,
  ] = await Promise.all([
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.repos.listCommits({
      owner,
      repo,
      since: ninetyDaysAgoIso,
      per_page: 100,
    }),
    octokit.rest.repos.getLatestRelease({ owner, repo }).catch(() => null),
    octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "closed",
      per_page: 100,
    }),
    octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    }),
    octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    }),
    // Fetch issues created in the last 90 days (for issue velocity metric)
    octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "all",
      since: ninetyDaysAgoIso,
      per_page: 100,
    }),
  ]);

  const commitsLast90Days = commits.data.length;
  const daysSinceLastCommit =
    commits.data.length > 0 && commits.data[0].commit.committer?.date
      ? getDaysSince(commits.data[0].commit.committer.date)
      : null;

  const daysSinceLastRelease = release?.data.published_at
    ? getDaysSince(release.data.published_at)
    : null;

  const openIssuesCount = openIssues.data.filter(
    (issue) => !issue.pull_request,
  ).length;
  const closedIssuesCount = closedIssues.data.filter(
    (issue) => !issue.pull_request,
  ).length;
  const totalIssues = openIssuesCount + closedIssuesCount;

  const openIssuesPercent =
    totalIssues > 0
      ? Math.round((openIssuesCount / totalIssues) * 100 * 10) / 10
      : null;

  const closedIssueResolutionDays: number[] = [];
  for (const issue of closedIssues.data) {
    if (!issue.pull_request && issue.closed_at && issue.created_at) {
      const created = new Date(issue.created_at).getTime();
      const closed = new Date(issue.closed_at).getTime();
      closedIssueResolutionDays.push(
        Math.floor((closed - created) / (1000 * 60 * 60 * 24)),
      );
    }
  }
  const medianIssueResolutionDays = getMedian(closedIssueResolutionDays);

  const openPrsCount = pulls.data.length;

  // Count issues created in the last 90 days (excluding PRs)
  // Note: The `since` parameter filters by updated_at, so we need to check created_at
  const ninetyDaysAgo = subDays(new Date(), 90);
  const issuesCreatedLast90Days = recentIssues.data.filter(
    (issue) =>
      !issue.pull_request && new Date(issue.created_at) >= ninetyDaysAgo,
  ).length;

  return {
    fullName: repoInfo.data.full_name,
    description: repoInfo.data.description,
    stars: repoInfo.data.stargazers_count,
    forks: repoInfo.data.forks_count,
    avatarUrl: repoInfo.data.owner.avatar_url,
    htmlUrl: repoInfo.data.html_url,
    license: repoInfo.data.license?.spdx_id ?? null,
    language: repoInfo.data.language ?? null,
    repositoryCreatedAt: new Date(repoInfo.data.created_at),
    isArchived: repoInfo.data.archived,
    daysSinceLastCommit,
    commitsLast90Days,
    daysSinceLastRelease,
    openIssuesPercent,
    medianIssueResolutionDays,
    openPrsCount,
    issuesCreatedLast90Days,
  };
}
