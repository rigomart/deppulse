import type { RepositoryRef } from "./repository";
import type { AnalysisStatus } from "./score";

export type ReleaseInfo = {
  tagName: string;
  name: string | null;
  publishedAt: string;
};

export type CommitActivityState = "pending" | "ready" | "failed";

export type CommitActivityWeek = {
  weekStart: string;
  totalCommits: number;
  dailyBreakdown: [number, number, number, number, number, number, number];
};

export type CommitActivity = {
  state: CommitActivityState;
  attempts: number;
  lastAttemptedAt: string | null;
  errorMessage: string | null;
  weekly: CommitActivityWeek[];
};

export type AnalysisRunState =
  | "queued"
  | "running"
  | "waiting_retry"
  | "complete"
  | "failed"
  | "partial";

export type AnalysisRunProgressStep =
  | "bootstrap"
  | "metrics"
  | "commit_activity"
  | "finalize";

export type AnalysisRunTriggerSource =
  | "homepage"
  | "direct_visit"
  | "manual_refresh"
  | "system";

export interface MetricsSnapshot {
  description: string | null;
  stars: number;
  forks: number;
  avatarUrl: string;
  htmlUrl: string;
  license: string | null;
  language: string | null;
  repositoryCreatedAt: string | null;
  isArchived: boolean;
  lastCommitAt: string | null;
  lastReleaseAt: string | null;
  lastClosedIssueAt: string | null;
  lastMergedPrAt: string | null;
  openIssuesPercent: number | null;
  openIssuesCount: number;
  closedIssuesCount: number;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLastYear: number;
  commitsLast30Days?: number;
  commitsLast90Days: number;
  commitsLast365Days?: number;
  mergedPrsLast90Days: number;
  releases: Array<ReleaseInfo>;
  readmeContent?: string | null;
  commitActivity?: CommitActivity;
}

export interface AnalysisRun {
  id: string;
  repository: RepositoryRef;
  status: AnalysisStatus;
  runState?: AnalysisRunState;
  progressStep?: AnalysisRunProgressStep;
  attemptCount?: number;
  triggerSource?: AnalysisRunTriggerSource;
  updatedAt?: number;
  metrics: MetricsSnapshot | null;
  startedAt: number;
  completedAt: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}
