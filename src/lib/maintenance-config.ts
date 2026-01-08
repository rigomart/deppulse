/**
 * Centralized configuration for the maintenance scoring algorithm.
 * All thresholds and weights are defined here for easy tuning.
 *
 * Scoring implementation: see maintenance.ts
 */

/** Repository maturity affects which thresholds are applied */
export type MaturityTier = "emerging" | "growing" | "mature";

/** Final score category based on total points */
export type MaintenanceCategory =
  | "healthy" // 70-100: Actively maintained
  | "moderate" // 45-69: Adequately maintained
  | "declining" // 25-44: Signs of declining maintenance
  | "inactive"; // 0-24: No recent activity

/**
 * Thresholds for activity metrics, varying by maturity tier.
 *
 * commitDays: [100%, 50%, 20%, 5%] - days since last commit
 * commitVolume: commits within tier-specific timeframe
 * releaseDays: [100%, 50%, 15%] - days since last release
 */
interface TierThresholds {
  commitDays: [number, number, number, number];
  commitVolume: {
    weeks: number;
    thresholds: [number, number, number];
  };
  releaseDays: [number, number, number];
}

interface MaintenanceConfig {
  categoryThresholds: {
    healthy: number;
    moderate: number;
    atRisk: number;
  };
  weights: {
    activity: { total: number; lastCommit: number; commitVolume: number };
    responsiveness: { total: number; issueResolution: number };
    stability: { total: number; releaseRecency: number; projectAge: number };
    community: { total: number; popularity: number };
  };
  maturityTiers: {
    emerging: TierThresholds;
    growing: TierThresholds;
    mature: TierThresholds;
  };
  maturityCriteria: {
    matureMinAgeYears: number;
    matureMinStars: number;
    growingMinAgeYears: number;
    growingMinStars: number;
  };
  issueResolution: {
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
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  // Score thresholds for category classification
  categoryThresholds: {
    healthy: 70, // 70-100
    moderate: 45, // 45-69
    atRisk: 25, // 25-44 = declining, below = inactive
  },

  // Points allocation (must sum to 100)
  weights: {
    activity: {
      total: 70, // Activity is primary signal - no commits = not maintained
      lastCommit: 35, // Days since last commit (max 35 pts)
      commitVolume: 35, // Commit count in timeframe (max 35 pts)
    },
    responsiveness: {
      total: 15,
      issueResolution: 15, // Median days to close issues (max 15 pts)
    },
    stability: {
      total: 10,
      releaseRecency: 5, // Days since last release (max 5 pts)
      projectAge: 5, // Years since creation (max 5 pts)
    },
    community: {
      total: 5,
      popularity: 5, // stars + forks*2 (max 5 pts)
    },
  },

  // Thresholds vary by project maturity - mature projects can have gaps
  maturityTiers: {
    // Emerging: <2 years AND <1k popularity - expects frequent activity
    emerging: {
      // Days since last commit: [100%, 50%, 20%, 5%] points
      commitDays: [30, 60, 120, 180],
      commitVolume: {
        weeks: 13, // Look at last 3 months
        // Commits needed for [100%, 45%, 15%] points
        thresholds: [15, 8, 3],
      },
      // Days since last release: [100%, 50%, 15%] points
      releaseDays: [60, 120, 180],
    },

    // Growing: 2-5 years OR 1k-10k popularity - moderate expectations
    growing: {
      commitDays: [45, 90, 150, 270],
      commitVolume: {
        weeks: 26, // Look at last 6 months
        thresholds: [35, 18, 6],
      },
      releaseDays: [60, 150, 270],
    },

    // Mature: 5+ years OR 10k+ popularity - maintenance mode is acceptable
    mature: {
      commitDays: [120, 180, 365, 730],
      commitVolume: {
        weeks: 52, // Look at full year
        thresholds: [18, 9, 3],
      },
      releaseDays: [180, 365, 730],
    },
  },

  // How to classify repository maturity (uses popularity = stars + forks*2)
  maturityCriteria: {
    matureMinAgeYears: 5, // 5+ years OR
    matureMinStars: 10000, // 10k+ popularity
    growingMinAgeYears: 2, // 2+ years OR
    growingMinStars: 1000, // 1k+ popularity
  },

  // Median issue resolution time thresholds (days) → [100%, 80%, 50%, 25%] points
  issueResolution: {
    excellent: 7,
    good: 14,
    fair: 30,
    poor: 60,
  },

  // Popularity thresholds (stars + forks*2) → [100%, 85%, 70%, 50%, 30%] points
  popularity: {
    excellent: 50000,
    good: 10000,
    fair: 1000,
    poor: 100,
    minimal: 10,
  },

  // Project age thresholds (years) → [100%, 80%, 50%, 25%] points
  projectAge: {
    mature: 5,
    established: 3,
    growing: 1,
    new: 0.5,
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
