/**
 * Centralized configuration for the maintenance scoring algorithm.
 * All thresholds and weights are defined here for easy tuning.
 */

export type MaturityTier = "emerging" | "growing" | "mature";
export type MaintenanceCategory =
  | "healthy"
  | "moderate"
  | "declining"
  | "inactive";

/**
 * Thresholds for each maturity tier.
 * Arrays represent: [full points, partial points, low points, zero points]
 * For commit days: [recent, acceptable, stale, old]
 * For commit volume: thresholds are per year (52 weeks)
 */
interface TierThresholds {
  commitDays: [number, number, number, number];
  commitVolumeYear: [number, number, number]; // [high, medium, low] - per year
  releaseDays: [number, number, number]; // [recent, acceptable, old]
}

interface MaintenanceConfig {
  // Category score thresholds (score >= threshold = that category)
  categoryThresholds: {
    healthy: number;
    moderate: number;
    atRisk: number;
    // inactive is anything below atRisk
  };

  // Weight distribution (must sum to 100)
  weights: {
    activity: {
      total: number;
      lastCommit: number;
      commitVolume: number;
    };
    responsiveness: {
      total: number;
      issueResolution: number;
    };
    stability: {
      total: number;
      releaseRecency: number;
      projectAge: number;
    };
    community: {
      total: number;
      popularity: number;
    };
  };

  // Maturity tier thresholds
  maturityTiers: {
    emerging: TierThresholds;
    growing: TierThresholds;
    mature: TierThresholds;
  };

  // Maturity tier classification criteria
  maturityCriteria: {
    matureMinAgeYears: number;
    matureMinStars: number;
    growingMinAgeYears: number;
    growingMinStars: number;
  };

  // Issue resolution thresholds (days)
  issueResolution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };

  // Popularity thresholds (stars + forks * 2)
  popularity: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    minimal: number;
  };

  // Project age thresholds (years)
  projectAge: {
    mature: number;
    established: number;
    growing: number;
    new: number;
  };
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  categoryThresholds: {
    healthy: 70,
    moderate: 45,
    atRisk: 20,
  },

  // Weight distribution (sums to 100)
  // Activity is weighted most heavily - no commits = not maintained
  // For a maintenance health tool, activity is the primary signal
  weights: {
    activity: {
      total: 60,
      lastCommit: 35,
      commitVolume: 25,
    },
    responsiveness: {
      total: 15,
      issueResolution: 15,
    },
    stability: {
      total: 15,
      releaseRecency: 8,
      projectAge: 7,
    },
    community: {
      total: 10,
      popularity: 10,
    },
  },

  maturityTiers: {
    // Emerging: < 2 years AND < 1k stars - strictest
    emerging: {
      commitDays: [30, 60, 120, 180],
      commitVolumeYear: [120, 40, 12], // ~30/quarter, ~10/quarter, ~3/quarter
      releaseDays: [60, 120, 180],
    },
    // Growing: 2-5 years OR 1k-10k stars - moderate
    growing: {
      commitDays: [60, 120, 180, 365],
      commitVolumeYear: [80, 20, 4], // ~20/quarter, ~5/quarter, ~1/quarter
      releaseDays: [90, 180, 365],
    },
    // Mature: 5+ years OR 10k+ stars - relaxed
    mature: {
      commitDays: [120, 180, 365, 730], // 4mo, 6mo, 1yr, 2yr
      commitVolumeYear: [40, 12, 4], // ~10/quarter, ~3/quarter, ~1/quarter
      releaseDays: [180, 365, 730], // 6mo, 1yr, 2yr
    },
  },

  maturityCriteria: {
    matureMinAgeYears: 5,
    matureMinStars: 10000,
    growingMinAgeYears: 2,
    growingMinStars: 1000,
  },

  issueResolution: {
    excellent: 7,
    good: 14,
    fair: 30,
    poor: 60,
  },

  popularity: {
    excellent: 50000,
    good: 10000,
    fair: 1000,
    poor: 100,
    minimal: 10,
  },

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
