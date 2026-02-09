import type { MaintenanceCategory } from "@/lib/maintenance";
import type { RepositoryRef } from "./repository";
import type { AnalysisStatus, ScoreBreakdown } from "./score";

export type CommitActivityEntry = { week: string; commits: number };
export type ReleaseInfo = {
  tagName: string;
  name: string | null;
  publishedAt: string;
};

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
  openIssuesPercent: number | null;
  openIssuesCount: number;
  closedIssuesCount: number;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
  issuesCreatedLastYear: number;
  releases: Array<ReleaseInfo>;
  readmeContent?: string | null;
}

export interface AnalysisRun {
  id: number;
  repository: RepositoryRef;
  status: AnalysisStatus;
  metrics: MetricsSnapshot | null;
  commitActivity: Array<CommitActivityEntry>;
  score: number | null;
  category: MaintenanceCategory | null;
  scoreBreakdown: ScoreBreakdown | null;
  startedAt: Date;
  completedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
}
