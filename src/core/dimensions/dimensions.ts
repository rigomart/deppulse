import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { rateDevelopmentActivity } from "./development-activity";
import { rateIssueManagement } from "./issue-management";
import { rateReleaseCadence } from "./release-cadence";
import type { DimensionsOutput } from "./types";

export function computeDimensions(
  metrics: MetricsSnapshot,
  analysisTime: Date,
): DimensionsOutput {
  return {
    developmentActivity: rateDevelopmentActivity(metrics, analysisTime),
    issueManagement: rateIssueManagement(metrics, analysisTime),
    releaseCadence: rateReleaseCadence(metrics, analysisTime),
  };
}
