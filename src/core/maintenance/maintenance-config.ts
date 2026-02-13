import { STRICT_BALANCED_PROFILE } from "../scoring";

/** Final score category based on total points */
export type MaintenanceCategory =
  | "healthy"
  | "moderate"
  | "declining"
  | "inactive";

const qualityWeights = STRICT_BALANCED_PROFILE.qualityWeights;
const issueSplit = STRICT_BALANCED_PROFILE.issueHealthSplit;

function toPoints(weight: number): number {
  return Math.round(weight * 100);
}

export const MAINTENANCE_CONFIG = {
  categoryThresholds: STRICT_BALANCED_PROFILE.categoryThresholds,
  quality: {
    issueHealth: {
      total: toPoints(qualityWeights.issueHealth),
      openRatio: Math.round(
        toPoints(qualityWeights.issueHealth) * issueSplit.openRatio,
      ),
      resolutionSpeed: Math.round(
        toPoints(qualityWeights.issueHealth) * issueSplit.resolutionSpeed,
      ),
    },
    releaseHealth: {
      total: toPoints(qualityWeights.releaseHealth),
      cadence: toPoints(qualityWeights.releaseHealth),
    },
    community: {
      total: toPoints(qualityWeights.community),
      stars: toPoints(qualityWeights.community),
    },
    maturity: {
      total: toPoints(qualityWeights.maturity),
      age: toPoints(qualityWeights.maturity),
    },
    activityBreadth: {
      total: toPoints(qualityWeights.activityBreadth),
    },
  },
  expectedActivityCriteria: STRICT_BALANCED_PROFILE.expectedActivityCriteria,
  freshnessMultipliers: STRICT_BALANCED_PROFILE.freshnessMultipliers,
  hardCaps: STRICT_BALANCED_PROFILE.hardCaps,
} as const;

export const MAINTENANCE_CATEGORY_INFO: Record<
  MaintenanceCategory,
  { label: string; description: string; recommendation: string }
> = {
  healthy: {
    label: "Healthy",
    description: "Actively maintained with strong community engagement.",
    recommendation: "Safe to adopt. Monitor normally.",
  },
  moderate: {
    label: "Moderate",
    description: "Adequately maintained. Some areas may need attention.",
    recommendation: "Safe to adopt. Check for updates periodically.",
  },
  declining: {
    label: "Declining",
    description: "Signs of declining maintenance. May not receive updates.",
    recommendation: "Evaluate alternatives. Have a backup plan.",
  },
  inactive: {
    label: "Inactive",
    description:
      "No recent activity. Could be stable/feature-complete or unmaintained.",
    recommendation: "Review metrics to determine if stable or abandoned.",
  },
};
