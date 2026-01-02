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

function scoreLastCommit(days: number | null): number {
  if (days === null) return 30; // No commits = max risk
  if (days <= 30) return 0;
  if (days <= 90) return 10;
  if (days <= 180) return 20;
  return 30;
}

function scoreCommitVolume(commits: number): number {
  if (commits >= 50) return 0;
  if (commits >= 20) return 5;
  if (commits >= 5) return 10;
  return 20;
}

function scoreLastRelease(days: number | null): number {
  if (days === null) return 10; // No releases = moderate risk (some projects don't use releases)
  if (days <= 90) return 0;
  if (days <= 180) return 5;
  if (days <= 365) return 10;
  return 15;
}

function scoreOpenIssuesPercent(percent: number | null): number {
  if (percent === null) return 0; // No issues = no risk signal
  if (percent <= 25) return 0;
  if (percent <= 50) return 5;
  if (percent <= 75) return 10;
  return 15;
}

function scoreIssueResolution(days: number | null): number {
  if (days === null) return 0; // No data = no risk signal
  if (days <= 7) return 0;
  if (days <= 30) return 3;
  if (days <= 90) return 7;
  return 10;
}

function scoreOpenPrs(count: number): number {
  if (count <= 10) return 0;
  if (count <= 50) return 3;
  if (count <= 100) return 7;
  return 10;
}

function categoryFromScore(score: number): RiskCategory {
  if (score <= 20) return "active";
  if (score <= 40) return "stable";
  if (score <= 65) return "at-risk";
  return "abandoned";
}

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
