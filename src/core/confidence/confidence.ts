import {
  API_LIMITS,
  CONFIDENCE_THRESHOLDS,
  STALENESS,
} from "./confidence-config";
import type {
  ConfidenceInput,
  ConfidenceLevel,
  ConfidencePenalty,
  ConfidenceResult,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

function buildSummary(penalties: ConfidencePenalty[]): string | null {
  if (penalties.length === 0) return null;
  if (penalties.length === 1) return penalties[0].reason;
  return "Score may be approximate due to multiple data gaps";
}

function checkRunFailed(input: ConfidenceInput): ConfidencePenalty | null {
  if (input.status === "failed") {
    return { id: "run_failed", points: 40, reason: "Analysis failed" };
  }
  return null;
}

function checkRunPartial(input: ConfidenceInput): ConfidencePenalty | null {
  if (input.status === "partial") {
    return {
      id: "run_partial",
      points: 20,
      reason: "Analysis completed with partial data",
    };
  }
  return null;
}

function checkMissingOpenIssuesPercent(
  input: ConfidenceInput,
): ConfidencePenalty | null {
  if (input.metrics?.openIssuesPercent == null) {
    return {
      id: "missing_open_issues_percent",
      points: 10,
      reason: "Issue health data unavailable",
    };
  }
  return null;
}

function checkMissingMedianResolution(
  input: ConfidenceInput,
): ConfidencePenalty | null {
  if (input.metrics?.medianIssueResolutionDays == null) {
    return {
      id: "missing_median_resolution",
      points: 8,
      reason: "Issue resolution time unavailable",
    };
  }
  return null;
}

function checkMissingCommitHistory(
  input: ConfidenceInput,
): ConfidencePenalty | null {
  if (input.metrics?.lastCommitAt == null) {
    return {
      id: "missing_commit_history",
      points: 12,
      reason: "No commit history found",
    };
  }
  return null;
}

function checkNoReleases(input: ConfidenceInput): ConfidencePenalty | null {
  if (input.metrics && input.metrics.releases.length === 0) {
    return {
      id: "no_releases",
      points: 8,
      reason: "No release history available",
    };
  }
  return null;
}

function checkStaleness(
  input: ConfidenceInput,
  now: Date,
): ConfidencePenalty | null {
  const analyzedAt = input.completedAt ?? input.startedAt;
  const daysSince = (now.getTime() - analyzedAt) / DAY_MS;

  if (daysSince <= STALENESS.gracePeriodDays) return null;

  const range = STALENESS.maxPenaltyDays - STALENESS.gracePeriodDays;
  const elapsed = Math.min(daysSince - STALENESS.gracePeriodDays, range);
  const points = Math.round((elapsed / range) * STALENESS.maxPenaltyPoints);

  if (points <= 0) return null;

  const daysRounded = Math.round(daysSince);
  return {
    id: "stale_analysis",
    points,
    reason: `Analysis is ${daysRounded} day${daysRounded === 1 ? "" : "s"} old`,
  };
}

function checkMergedPrsCapped(
  input: ConfidenceInput,
): ConfidencePenalty | null {
  if (
    input.metrics &&
    input.metrics.mergedPrsLast90Days >= API_LIMITS.mergedPrs
  ) {
    return {
      id: "merged_prs_capped",
      points: 8,
      reason: "PR data may be incomplete",
    };
  }
  return null;
}

function checkIssuesCapped(input: ConfidenceInput): ConfidencePenalty | null {
  if (
    input.metrics &&
    input.metrics.issuesCreatedLastYear >= API_LIMITS.recentIssues
  ) {
    return {
      id: "issues_capped",
      points: 8,
      reason: "Issue data may be sampled",
    };
  }
  return null;
}

const PENALTY_CHECKS = [
  checkRunFailed,
  checkRunPartial,
  checkMissingOpenIssuesPercent,
  checkMissingMedianResolution,
  checkMissingCommitHistory,
  checkNoReleases,
  checkMergedPrsCapped,
  checkIssuesCapped,
] as const;

/**
 * Rates how much we trust an analysis score, based on data completeness,
 * freshness, and whether any API limits were hit. Returns a 0–100 score,
 * a level (high / medium / low), and a human-readable summary of any issues.
 *
 * @param input - The analysis data to evaluate (status, timestamps, and metrics).
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const now = new Date();

  if (!input.metrics) {
    return {
      level: "low",
      score: 0,
      penalties: [
        { id: "no_metrics", points: 100, reason: "No metrics available" },
      ],
      summary: "No metrics available",
    };
  }

  const penalties: ConfidencePenalty[] = [];

  for (const check of PENALTY_CHECKS) {
    const penalty = check(input);
    if (penalty) penalties.push(penalty);
  }

  // Staleness needs the `now` param
  const stalenessPenalty = checkStaleness(input, now);
  if (stalenessPenalty) penalties.push(stalenessPenalty);

  const totalDeduction = penalties.reduce((sum, p) => sum + p.points, 0);
  const score = Math.max(0, 100 - totalDeduction);

  return {
    level: toLevel(score),
    score,
    penalties,
    summary: buildSummary(penalties),
  };
}
