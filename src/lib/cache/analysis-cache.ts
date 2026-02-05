import type { AnalysisRun } from "@/lib/domain/assessment";

export const ANALYSIS_FRESHNESS_SECONDS = 60 * 60 * 24 * 7;
export const ANALYSIS_CACHE_LIFE = {
  stale: 300,
  revalidate: ANALYSIS_FRESHNESS_SECONDS,
  expire: ANALYSIS_FRESHNESS_SECONDS + 3600,
} as const;

export function isAnalysisFresh(
  run: Pick<AnalysisRun, "startedAt" | "completedAt">,
  now: Date = new Date(),
): boolean {
  const timestamp = run.completedAt ?? run.startedAt;
  const ageSeconds = (now.getTime() - timestamp.getTime()) / 1000;
  return ageSeconds < ANALYSIS_FRESHNESS_SECONDS;
}
