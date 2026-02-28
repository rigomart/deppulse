import type { AnalysisStatus } from "@/lib/domain/score";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceInput {
  status: AnalysisStatus;
  startedAt: number;
  completedAt: number | null;
  metrics: {
    openIssuesPercent: number | null;
    medianIssueResolutionDays: number | null;
    lastCommitAt: string | null;
    releases: readonly unknown[];
    mergedPrsLast90Days: number;
    issuesCreatedLastYear: number;
  } | null;
}

export interface ConfidencePenalty {
  id: string;
  points: number;
  reason: string;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;
  penalties: ConfidencePenalty[];
  summary: string | null;
}
