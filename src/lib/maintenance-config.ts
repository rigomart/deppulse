/**
 * Centralized configuration for the maintenance scoring algorithm.
 *
 * Scoring model: engagement × quality
 * - Engagement (0-1): How recently was there ANY maintenance activity?
 * - Quality (0-100): How good is the maintenance across dimensions?
 * - Final score = round(quality × engagement)
 *
 * Scoring implementation: see maintenance.ts
 */

/** Final score category based on total points */
export type MaintenanceCategory =
  | "healthy" // 70-100: Actively maintained
  | "moderate" // 45-69: Adequately maintained
  | "declining" // 25-44: Signs of declining maintenance
  | "inactive"; // 0-24: No recent activity

interface MaintenanceConfig {
  categoryThresholds: {
    healthy: number;
    moderate: number;
    declining: number;
  };
  engagementThresholds: Array<{ maxDays: number; factor: number }>;
  quality: {
    issueHealth: { total: number; openRatio: number; resolutionSpeed: number };
    releaseHealth: { total: number; cadence: number };
    community: { total: number; stars: number };
    maturity: { total: number; age: number };
    activityBreadth: { total: number };
  };
  issueResolution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  openIssuesRatio: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  popularity: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    minimal: number;
  };
  projectAge: {
    mature: number;
    established: number;
    growing: number;
    new: number;
  };
  releaseCadence: {
    excellent: number;
    good: number;
    fair: number;
  };
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  // Score thresholds for category classification
  categoryThresholds: {
    healthy: 70, // 70-100
    moderate: 45, // 45-69
    declining: 25, // 25-44, below = inactive
  },

  // Engagement factor: days since most recent maintenance activity → multiplier
  // Checks: lastCommitAt, lastMergedPrAt, lastReleaseAt
  engagementThresholds: [
    { maxDays: 90, factor: 1.0 },
    { maxDays: 180, factor: 0.8 },
    { maxDays: 365, factor: 0.5 },
    { maxDays: 730, factor: 0.2 },
    { maxDays: Infinity, factor: 0.1 },
  ],

  // Quality dimensions (must sum to 100)
  quality: {
    issueHealth: {
      total: 30, // Issue backlog + resolution quality
      openRatio: 15, // Open issues as % of total (max 15 pts)
      resolutionSpeed: 15, // Median days to close issues (max 15 pts)
    },
    releaseHealth: {
      total: 25,
      cadence: 25, // Releases per year (max 25 pts)
    },
    community: {
      total: 15,
      stars: 15, // Stars (max 15 pts)
    },
    maturity: {
      total: 10,
      age: 10, // Years since creation (max 10 pts)
    },
    activityBreadth: {
      total: 20, // How many channels show activity in last year (max 20 pts)
    },
  },

  // Median issue resolution time thresholds (days) → [100%, 80%, 50%, 25%]
  issueResolution: {
    excellent: 7,
    good: 14,
    fair: 30,
    poor: 60,
  },

  // Open issues ratio thresholds (%) → [100%, 70%, 40%, 15%, 0%]
  openIssuesRatio: {
    excellent: 20,
    good: 40,
    fair: 60,
    poor: 80,
  },

  // Popularity thresholds (stars) → [100%, 85%, 70%, 50%, 30%]
  popularity: {
    excellent: 25000,
    good: 5000,
    fair: 500,
    poor: 50,
    minimal: 10,
  },

  // Project age thresholds (years) → [100%, 80%, 60%, 30%]
  projectAge: {
    mature: 5,
    established: 3,
    growing: 1,
    new: 0.5,
  },

  // Release cadence thresholds (releases per year) → [100%, 75%, 40%]
  releaseCadence: {
    excellent: 6,
    good: 3,
    fair: 1,
  },
};

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
