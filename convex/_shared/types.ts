export type AnalysisStatus =
  | "queued"
  | "running"
  | "partial"
  | "complete"
  | "failed";

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
