export const RED_FLAGS_THRESHOLDS = {
  /** Days of no meaningful activity before triggering extended inactivity */
  extendedInactivityDays: 180,

  /** Minimum commits in last 90 days to consider "active commits" */
  activeCommitsThreshold: 5,

  /** Days since last release to consider "no release despite active commits" */
  noRecentReleaseDays: 180,

  /** Minimum open PRs to consider the stale PR check */
  stalePrsMinOpen: 3,

  /** Minimum age in years for "no releases ever" to be meaningful */
  noReleasesEverMinAgeYears: 1,

  /** Minimum commits in last 365 days for "no releases ever" */
  noReleasesEverMinCommits: 10,
} as const;
