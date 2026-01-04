/**
 * Shared metrics payload used for risk calculation and database storage.
 * These fields are computed from GitHub API data and used across multiple modules.
 */
export type MetricsPayload = {
  daysSinceLastCommit: number | null;
  commitsLast90Days: number;
  daysSinceLastRelease: number | null;
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
};
