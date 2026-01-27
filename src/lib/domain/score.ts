import type { MaintenanceCategory, MaturityTier } from "@/lib/maintenance";

export type AnalysisStatus =
  | "metrics_fetched"
  | "score_pending"
  | "complete"
  | "failed";

export interface ScoreBreakdown {
  maturityTier: MaturityTier;
}

export interface ScoreSnapshot {
  score: number | null;
  category: MaintenanceCategory | null;
  breakdown: ScoreBreakdown | null;
}
