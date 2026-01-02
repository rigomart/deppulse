export type RiskCategory = "active" | "stable" | "at-risk" | "abandoned";

export interface RiskInput {
  daysSinceLastCommit: number | null;
  commitsLast90Days: number;
  daysSinceLastRelease: number | null;
  openIssuesPercent: number | null;
  medianIssueResolutionDays: number | null;
  openPrsCount: number;
}

export interface RiskResult {
  category: RiskCategory;
  score: number;
}

/**
 * Scores repository risk contribution based on how many days have passed since the last commit.
 *
 * @param days - Days since the last commit, or `null` if there are no commits
 * @returns `0`, `10`, `20`, or `30` representing increasing risk; returns `30` when `days` is `null` or greater than 180
 */
function scoreLastCommit(days: number | null): number {
  if (days === null) return 30; // No commits = max risk
  if (days <= 30) return 0;
  if (days <= 90) return 10;
  if (days <= 180) return 20;
  return 30;
}

/**
 * Scores recent commit volume as a numeric risk contribution.
 *
 * @param commits - Number of commits in the evaluation window (commits in the last 90 days).
 * @returns The score: `0` if `commits >= 50`, `5` if `commits >= 20`, `10` if `commits >= 5`, `20` otherwise.
 */
function scoreCommitVolume(commits: number): number {
  if (commits >= 50) return 0;
  if (commits >= 20) return 5;
  if (commits >= 5) return 10;
  return 20;
}

/**
 * Converts days since the last release into a numeric release-risk score.
 *
 * @param days - Days since the most recent release, or `null` if the project has no recorded releases
 * @returns `0` if the last release was 90 days or less, `5` if between 91 and 180 days, `10` if between 181 and 365 days or if `days` is `null`, and `15` if more than 365 days
 */
function scoreLastRelease(days: number | null): number {
  if (days === null) return 10; // No releases = moderate risk (some projects don't use releases)
  if (days <= 90) return 0;
  if (days <= 180) return 5;
  if (days <= 365) return 10;
  return 15;
}

/**
 * Scores risk contribution from the share of open issues.
 *
 * @param percent - Percentage of open issues (0–100). `null` indicates no signal.
 * @returns `0` for `null` or <=25, `5` for >25 and <=50, `10` for >50 and <=75, `15` for >75
 */
function scoreOpenIssuesPercent(percent: number | null): number {
  if (percent === null) return 0; // No issues = no risk signal
  if (percent <= 25) return 0;
  if (percent <= 50) return 5;
  if (percent <= 75) return 10;
  return 15;
}

/**
 * Scores repository risk from median issue resolution time.
 *
 * @param days - Median number of days to resolve issues, or `null` if no data is available
 * @returns `0` if `days` is `null` or `<= 7`, `3` if `<= 30`, `7` if `<= 90`, `10` if `> 90`
 */
function scoreIssueResolution(days: number | null): number {
  if (days === null) return 0; // No data = no risk signal
  if (days <= 7) return 0;
  if (days <= 30) return 3;
  if (days <= 90) return 7;
  return 10;
}

/**
 * Maps the number of open pull requests to a risk contribution score.
 *
 * @param count - The number of open pull requests
 * @returns `0` if `count` is 10 or less, `3` if `count` is between 11 and 50, `7` if `count` is between 51 and 100, `10` if `count` is greater than 100
 */
function scoreOpenPrs(count: number): number {
  if (count <= 10) return 0;
  if (count <= 50) return 3;
  if (count <= 100) return 7;
  return 10;
}

/**
 * Map a numeric risk score to one of the defined RiskCategory values.
 *
 * @param score - Total risk score used to determine the category
 * @returns `active` if score <= 20, `stable` if score <= 40, `at-risk` if score <= 65, `abandoned` if score > 65
 */
function categoryFromScore(score: number): RiskCategory {
  if (score <= 20) return "active";
  if (score <= 40) return "stable";
  if (score <= 65) return "at-risk";
  return "abandoned";
}

/**
 * Aggregates repository metrics into a numeric maintenance risk score and corresponding category.
 *
 * @param metrics - Repository signals used to compute risk (recency and volume of commits/releases, issue and PR metrics)
 * @returns The computed RiskResult: `score` (0–100) and `category` one of `"active"`, `"stable"`, `"at-risk"`, or `"abandoned"`
 */
export function calculateRisk(metrics: RiskInput): RiskResult {
  const score =
    scoreLastCommit(metrics.daysSinceLastCommit) +
    scoreCommitVolume(metrics.commitsLast90Days) +
    scoreLastRelease(metrics.daysSinceLastRelease) +
    scoreOpenIssuesPercent(metrics.openIssuesPercent) +
    scoreIssueResolution(metrics.medianIssueResolutionDays) +
    scoreOpenPrs(metrics.openPrsCount);

  return {
    category: categoryFromScore(score),
    score,
  };
}

export const RISK_CATEGORY_INFO: Record<
  RiskCategory,
  { label: string; description: string }
> = {
  active: {
    label: "Active",
    description: "Healthy maintenance. Monitor normally.",
  },
  stable: {
    label: "Stable",
    description: "Maintained but quieter. May be mature.",
  },
  "at-risk": {
    label: "At Risk",
    description: "Reduced maintenance. Evaluate alternatives.",
  },
  abandoned: {
    label: "Abandoned",
    description: "Unmaintained. High risk for long-term use.",
  },
};