export type ConfidenceLevel = "high" | "medium" | "low";

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
