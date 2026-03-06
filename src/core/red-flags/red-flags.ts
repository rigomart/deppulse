import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { RED_FLAGS_THRESHOLDS } from "./red-flags-config";
import type { RedFlag } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function checkArchived(metrics: MetricsSnapshot): RedFlag | null {
  if (!metrics.isArchived) return null;
  return {
    id: "archived_repository",
    severity: "critical",
    title: "Archived repository",
    description:
      "This repository has been archived by its owner and is read-only. No further updates are expected.",
  };
}

function checkExtendedInactivity(
  metrics: MetricsSnapshot,
  now: Date,
): RedFlag | null {
  const activityDays = [
    daysSince(metrics.lastCommitAt, now),
    daysSince(metrics.lastMergedPrAt, now),
    daysSince(metrics.lastReleaseAt, now),
  ].filter((d): d is number => d !== null);

  if (activityDays.length === 0) return null;

  const mostRecentDays = Math.min(...activityDays);
  if (mostRecentDays < RED_FLAGS_THRESHOLDS.extendedInactivityDays) return null;

  return {
    id: "extended_inactivity",
    severity: "critical",
    title: "Extended inactivity",
    description: `No commits, merged pull requests, or releases in over ${RED_FLAGS_THRESHOLDS.extendedInactivityDays} days.`,
  };
}

function checkNoReleaseDespiteCommits(
  metrics: MetricsSnapshot,
  now: Date,
): RedFlag | null {
  if (metrics.commitsLast90Days < RED_FLAGS_THRESHOLDS.activeCommitsThreshold)
    return null;

  const daysSinceRelease = daysSince(metrics.lastReleaseAt, now);

  // Has a recent release — no flag
  if (
    daysSinceRelease !== null &&
    daysSinceRelease < RED_FLAGS_THRESHOLDS.noRecentReleaseDays
  )
    return null;

  // Active commits but no recent release (or no release at all)
  return {
    id: "no_release_despite_commits",
    severity: "warning",
    title: "No release despite active commits",
    description:
      "Commits are being made but no release has been published recently. Changes may not be reaching users.",
  };
}

function checkStalePullRequests(metrics: MetricsSnapshot): RedFlag | null {
  if (metrics.openPrsCount < RED_FLAGS_THRESHOLDS.stalePrsMinOpen) return null;
  if (metrics.mergedPrsLast90Days > 0) return null;

  return {
    id: "stale_pull_requests",
    severity: "critical",
    title: "Stale pull requests",
    description:
      "There are open pull requests but none have been merged in the last 90 days.",
  };
}

function checkNoIssuesActivity(metrics: MetricsSnapshot): RedFlag | null {
  if (
    metrics.issuesCreatedLastYear > 0 ||
    metrics.closedIssuesCount > 0 ||
    metrics.openIssuesCount > 0
  )
    return null;

  if (metrics.commitsLast90Days < RED_FLAGS_THRESHOLDS.activeCommitsThreshold)
    return null;

  return {
    id: "no_issues_activity",
    severity: "warning",
    title: "No issues tracker activity",
    description:
      "No issues have been opened or closed despite active development. The issue tracker may not be used for coordination.",
  };
}

function checkNoReleasesEver(
  metrics: MetricsSnapshot,
  now: Date,
): RedFlag | null {
  if (metrics.releases.length > 0) return null;

  const ageDays = daysSince(metrics.repositoryCreatedAt, now);
  if (ageDays === null) return null;

  const ageYears = ageDays / 365;
  if (ageYears < RED_FLAGS_THRESHOLDS.noReleasesEverMinAgeYears) return null;

  const commitsLastYear =
    metrics.commitsLast365Days ?? metrics.commitsLast90Days * 4;
  if (commitsLastYear < RED_FLAGS_THRESHOLDS.noReleasesEverMinCommits)
    return null;

  return {
    id: "no_releases_ever",
    severity: "warning",
    title: "No releases published",
    description:
      "This repository has never cut a release despite being active for over a year. There may be no formal versioning.",
  };
}

export function detectRedFlags(metrics: MetricsSnapshot): RedFlag[] {
  const now = new Date();

  return [
    checkArchived(metrics),
    checkExtendedInactivity(metrics, now),
    checkNoReleaseDespiteCommits(metrics, now),
    checkStalePullRequests(metrics),
    checkNoIssuesActivity(metrics),
    checkNoReleasesEver(metrics, now),
  ].filter((flag): flag is RedFlag => flag !== null);
}
