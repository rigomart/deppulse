import { differenceInDays } from "date-fns";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import type { DimensionResult } from "./types";

export function rateDevelopmentActivity(
  metrics: MetricsSnapshot,
  analysisTime: Date,
): DimensionResult {
  const commits90d = metrics.commitsLast90Days;
  const mergedPrs90d = metrics.mergedPrsLast90Days;

  const daysSinceLastCommit = metrics.lastCommitAt
    ? differenceInDays(analysisTime, new Date(metrics.lastCommitAt))
    : null;

  const inputs: DimensionResult["inputs"] = {
    commits90d,
    mergedPrs90d,
    daysSinceLastCommit,
    commitsLast30Days: metrics.commitsLast30Days ?? null,
  };

  if (daysSinceLastCommit === null || daysSinceLastCommit > 365) {
    return { dimension: "development-activity", level: "inactive", inputs };
  }

  const isStrong = commits90d >= 15 && daysSinceLastCommit <= 30;
  const isAdequate = commits90d >= 4 || daysSinceLastCommit <= 90;

  const level = isStrong ? "strong" : isAdequate ? "adequate" : "weak";

  return { dimension: "development-activity", level, inputs };
}
