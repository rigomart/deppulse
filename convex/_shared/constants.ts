import type { AnalysisRunState } from "./types";

export const COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS = [
  1, 2, 3, 5, 8, 13,
] as const;

export const COMMIT_ACTIVITY_MAX_ATTEMPTS =
  COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS.length;

export const ANALYSIS_FRESHNESS_MS = 60 * 60 * 24 * 3 * 1000;

export const PAGE_VISIT_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;

export const COMMIT_ACTIVITY_DELAYED_RETRY_MS = 15 * 60 * 1000;

export function isTerminalRunState(
  state: AnalysisRunState | undefined,
): boolean {
  return state === "complete" || state === "failed" || state === "partial";
}
