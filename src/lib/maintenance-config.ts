/**
 * Centralized configuration for the maintenance scoring algorithm.
 * All thresholds and weights are defined here for easy tuning.
 */

export type MaturityTier = "emerging" | "growing" | "mature";
export type MaintenanceCategory =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "critical";

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
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    // critical is anything below poor
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
    excellent: 80,
    good: 60,
    fair: 40,
    poor: 20,
  },

  weights: {
    activity: {
      total: 40,
      lastCommit: 25,
      commitVolume: 15,
    },
    responsiveness: {
      total: 30,
      issueResolution: 12,
      openIssuesPercent: 12,
      issueVelocity: 6,
    },
    stability: {
      total: 20,
      releaseRecency: 12,
      projectAge: 8,
    },
    community: {
      total: 10,
      openPrs: 5,
      popularity: 5,
    },
  },

  maturityTiers: {
    // Emerging: < 2 years AND < 1k stars - strictest thresholds
    emerging: {
      commitDays: [60, 120, 180, 365],
      commitVolume: [30, 10, 3],
      releaseDays: [90, 180, 365],
    },
    // Growing: 2-5 years OR 1k-10k stars - relaxed thresholds
    growing: {
      commitDays: [90, 180, 270, 540],
      commitVolume: [20, 5, 1],
      releaseDays: [180, 365, 730],
    },
    // Mature: 5+ years AND 10k+ stars - most relaxed (but still strict)
    mature: {
      commitDays: [180, 365, 540, 730],
      commitVolume: [10, 3, 1],
      releaseDays: [365, 730, 1095],
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
    low: 5, // 5 or fewer issues in 90 days = low velocity (good)
    medium: 20, // 6-20 issues = medium
    high: 50, // 21-50 = high, >50 = very high
  },

  openPrs: {
    excellent: 5,
    good: 15,
    fair: 30,
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
  excellent: {
    label: "Excellent",
    description: "Actively maintained with strong community engagement.",
    recommendation: "Safe to adopt. Monitor normally.",
  },
  good: {
    label: "Good",
    description: "Well maintained and suitable for production use.",
    recommendation: "Safe to adopt. Check for updates periodically.",
  },
  fair: {
    label: "Fair",
    description: "Adequate maintenance with some areas of concern.",
    recommendation: "Acceptable with monitoring. Have a backup plan.",
  },
  poor: {
    label: "Poor",
    description: "Limited maintenance activity. May not receive updates.",
    recommendation: "Evaluate alternatives. Avoid for new projects.",
  },
  critical: {
    label: "Critical",
    description: "Appears unmaintained or abandoned.",
    recommendation: "Do not adopt. Migrate existing usage if possible.",
  },
};
