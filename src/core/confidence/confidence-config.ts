import type { ConfidenceLevel } from "./types";

export const CONFIDENCE_THRESHOLDS = {
  high: 85,
  medium: 60,
} as const;

export const STALENESS = {
  gracePeriodDays: 7,
  maxPenaltyDays: 30,
  maxPenaltyPoints: 25,
} as const;

export const API_LIMITS = {
  mergedPrs: 100,
  recentIssues: 100,
} as const;

export const CONFIDENCE_LEVEL_INFO: Record<
  ConfidenceLevel,
  { label: string; description: string }
> = {
  high: {
    label: "High confidence",
    description: "Score is based on complete, recent data.",
  },
  medium: {
    label: "Medium confidence",
    description: "Some data gaps or staleness may affect accuracy.",
  },
  low: {
    label: "Low confidence",
    description: "Significant data issues. Treat the score cautiously.",
  },
};
