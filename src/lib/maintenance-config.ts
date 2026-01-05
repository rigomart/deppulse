/**
 * Centralized configuration for the maintenance scoring algorithm.
 * All thresholds and weights are defined here for easy tuning.
 */

export type MaturityTier = "emerging" | "growing" | "mature";
export type MaintenanceCategory =
  | "healthy"
  | "moderate"
  | "at-risk"
  | "unmaintained";

/**
 * Thresholds for each maturity tier.
 * Arrays represent: [full points, partial points, low points, zero points]
 * For commit days: [recent, acceptable, stale, old]
 */
interface TierThresholds {
  commitDays: [number, number, number, number];
  commitVolume: [number, number, number]; // [high, medium, low]
  releaseDays: [number, number, number]; // [recent, acceptable, old]
}

interface MaintenanceConfig {
  // Category score thresholds (score >= threshold = that category)
  categoryThresholds: {
    healthy: number;
    moderate: number;
    atRisk: number;
    // unmaintained is anything below atRisk
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
      openIssuesPercent: number;
      issueVelocity: number;
    };
    stability: {
      total: number;
      releaseRecency: number;
      projectAge: number;
    };
    community: {
      total: number;
      openPrs: number;
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

  // Open issues percent thresholds
  openIssuesPercent: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };

  // Issue velocity thresholds (issues created in 90 days)
  // Lower is better for finished projects
  issueVelocity: {
    low: number; // Full points
    medium: number; // Partial points
    high: number; // Low points
  };

  // Open PRs thresholds
  openPrs: {
    excellent: number;
    good: number;
    fair: number;
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
      total: 20,
      issueResolution: 8,
      openIssuesPercent: 8,
      issueVelocity: 4,
    },
    stability: {
      total: 12,
      releaseRecency: 7,
      projectAge: 5,
    },
    community: {
      total: 8,
      openPrs: 4,
      popularity: 4,
    },
  },

  maturityTiers: {
    // Emerging: < 2 years AND < 1k stars - strictest thresholds
    emerging: {
      commitDays: [30, 60, 120, 180],
      commitVolume: [30, 10, 3],
      releaseDays: [60, 120, 180],
    },
    // Growing: 2-5 years OR 1k-10k stars - moderate thresholds
    growing: {
      commitDays: [60, 120, 180, 365],
      commitVolume: [20, 5, 1],
      releaseDays: [90, 180, 365],
    },
    // Mature: 5+ years OR 10k+ stars - relaxed for stable/finished projects
    // Stable utilities like clsx may not commit for 1-2 years but are still reliable
    mature: {
      commitDays: [180, 365, 730, 1095], // 6mo, 1yr, 2yr, 3yr
      commitVolume: [10, 3, 1],
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
    good: 30,
    fair: 90,
    poor: 180,
  },

  openIssuesPercent: {
    excellent: 20,
    good: 40,
    fair: 60,
    poor: 80,
  },

  issueVelocity: {
    low: 10, // 10 or fewer issues in 90 days = low velocity (stable/finished)
    medium: 30, // 11-30 issues = medium (normal activity)
    high: 80, // 31-80 = high (popular project), >80 = very high
  },

  openPrs: {
    excellent: 10,
    good: 25,
    fair: 50,
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
  "at-risk": {
    label: "At Risk",
    description: "Signs of declining maintenance. May not receive updates.",
    recommendation: "Evaluate alternatives. Have a backup plan.",
  },
  unmaintained: {
    label: "Unmaintained",
    description: "Appears abandoned. Unlikely to receive updates or fixes.",
    recommendation: "Avoid for new projects. Migrate existing usage.",
  },
};
