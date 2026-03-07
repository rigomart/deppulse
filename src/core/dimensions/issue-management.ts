import { differenceInDays } from "date-fns";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import type { DimensionResult } from "./types";

export function rateIssueManagement(
  metrics: MetricsSnapshot,
  analysisTime: Date,
): DimensionResult {
  const openPercent = metrics.openIssuesPercent;
  const resolutionDays = metrics.medianIssueResolutionDays;
  const totalIssues = metrics.openIssuesCount + metrics.closedIssuesCount;

  const daysSinceLastClosed = metrics.lastClosedIssueAt
    ? differenceInDays(analysisTime, new Date(metrics.lastClosedIssueAt))
    : null;

  const inputs: DimensionResult["inputs"] = {
    openIssuesPercent: openPercent,
    medianResolutionDays: resolutionDays,
    openIssuesCount: metrics.openIssuesCount,
    closedIssuesCount: metrics.closedIssuesCount,
    daysSinceLastClosed,
  };

  // No issues at all — no signal, not negative
  if (totalIssues === 0) {
    return { dimension: "issue-management", level: "adequate", inputs };
  }

  // Issues exist but none ever closed, or nothing closed in over a year
  const nothingClosedRecently =
    daysSinceLastClosed === null || daysSinceLastClosed > 365;
  if (nothingClosedRecently && metrics.closedIssuesCount === 0) {
    return { dimension: "issue-management", level: "inactive", inputs };
  }

  const isStrong =
    openPercent !== null &&
    openPercent <= 25 &&
    resolutionDays !== null &&
    resolutionDays <= 14;

  const isAdequate =
    (openPercent !== null && openPercent <= 50) ||
    (resolutionDays !== null && resolutionDays <= 30);

  const level = isStrong ? "strong" : isAdequate ? "adequate" : "weak";

  return { dimension: "issue-management", level, inputs };
}
