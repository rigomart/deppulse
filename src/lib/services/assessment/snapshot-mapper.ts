import type { MetricsSnapshot } from "@/lib/domain/assessment";

export function toMetricsSnapshot(metrics: {
  description: MetricsSnapshot["description"];
  stars: MetricsSnapshot["stars"];
  forks: MetricsSnapshot["forks"];
  avatarUrl: MetricsSnapshot["avatarUrl"];
  htmlUrl: MetricsSnapshot["htmlUrl"];
  license: MetricsSnapshot["license"];
  language: MetricsSnapshot["language"];
  repositoryCreatedAt: Date | null;
  isArchived: MetricsSnapshot["isArchived"];
  lastCommitAt: Date | null;
  lastReleaseAt: Date | null;
  lastClosedIssueAt: Date | null;
  openIssuesPercent: MetricsSnapshot["openIssuesPercent"];
  openIssuesCount: MetricsSnapshot["openIssuesCount"];
  closedIssuesCount: MetricsSnapshot["closedIssuesCount"];
  medianIssueResolutionDays: MetricsSnapshot["medianIssueResolutionDays"];
  openPrsCount: MetricsSnapshot["openPrsCount"];
  issuesCreatedLastYear: MetricsSnapshot["issuesCreatedLastYear"];
  releases: MetricsSnapshot["releases"];
  readmeContent?: MetricsSnapshot["readmeContent"];
}): MetricsSnapshot {
  return {
    ...metrics,
    repositoryCreatedAt: metrics.repositoryCreatedAt
      ? metrics.repositoryCreatedAt.toISOString()
      : null,
    lastCommitAt: metrics.lastCommitAt
      ? metrics.lastCommitAt.toISOString()
      : null,
    lastReleaseAt: metrics.lastReleaseAt
      ? metrics.lastReleaseAt.toISOString()
      : null,
    lastClosedIssueAt: metrics.lastClosedIssueAt
      ? metrics.lastClosedIssueAt.toISOString()
      : null,
  };
}
