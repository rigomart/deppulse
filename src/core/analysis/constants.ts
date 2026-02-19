import type { AnalysisRunState } from "@/lib/domain/assessment";

export const COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS = [
  1, 2, 3, 5, 8, 13,
] as const;
export const COMMIT_ACTIVITY_MAX_ATTEMPTS =
  COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS.length;

export function isTerminalRunState(
  state: AnalysisRunState | undefined,
): boolean {
  return state === "complete" || state === "failed" || state === "partial";
}
