import { normalizeIssueHealthSplit, normalizeQualityWeights } from "./profiles";
import { computeActivityBreadth } from "./signals";
import type { QualityComputation, ScoringInput, ScoringProfile } from "./types";

function scoreOpenIssuesRatio(
  openIssuesPercent: number | null,
  profile: ScoringProfile,
): number {
  const thresholds = profile.qualityThresholds.openIssuesRatio;

  if (openIssuesPercent === null) return 0.5;
  if (openIssuesPercent <= thresholds.excellent) return 1;
  if (openIssuesPercent <= thresholds.good) return 0.7;
  if (openIssuesPercent <= thresholds.fair) return 0.4;
  if (openIssuesPercent <= thresholds.poor) return 0.15;
  return 0;
}

function scoreIssueResolution(
  resolutionDays: number | null,
  openIssuesPercent: number | null,
  profile: ScoringProfile,
): number {
  const thresholds = profile.qualityThresholds.issueResolutionDays;

  if (resolutionDays === null) {
    const hasOpenIssues = openIssuesPercent !== null && openIssuesPercent > 0;
    return hasOpenIssues ? 0 : 0.5;
  }

  if (resolutionDays <= thresholds.excellent) return 1;
  if (resolutionDays <= thresholds.good) return 0.8;
  if (resolutionDays <= thresholds.fair) return 0.5;
  if (resolutionDays <= thresholds.poor) return 0.25;
  return 0;
}

function scoreReleaseCadence(
  releasesLastYear: number,
  profile: ScoringProfile,
): number {
  const thresholds = profile.qualityThresholds.releaseCadencePerYear;

  if (releasesLastYear >= thresholds.excellent) return 1;
  if (releasesLastYear >= thresholds.good) return 0.75;
  if (releasesLastYear >= thresholds.fair) return 0.4;
  return 0;
}

function scorePopularity(stars: number, profile: ScoringProfile): number {
  const thresholds = profile.qualityThresholds.popularityStars;

  if (stars >= thresholds.excellent) return 1;
  if (stars >= thresholds.good) return 0.85;
  if (stars >= thresholds.fair) return 0.7;
  if (stars >= thresholds.poor) return 0.5;
  if (stars >= thresholds.minimal) return 0.3;
  return 0.1;
}

function scoreProjectAge(
  createdAt: Date | null,
  now: Date,
  profile: ScoringProfile,
): number {
  const thresholds = profile.qualityThresholds.projectAgeYears;

  if (!createdAt) return 0.5;

  const ageYears =
    (now.getTime() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (ageYears >= thresholds.mature) return 1;
  if (ageYears >= thresholds.established) return 0.8;
  if (ageYears >= thresholds.growing) return 0.6;
  if (ageYears >= thresholds.newer) return 0.3;
  return 0.1;
}

export function computeQualityScore(
  input: ScoringInput,
  profile: ScoringProfile,
  now: Date,
): QualityComputation {
  const normalizedWeights = normalizeQualityWeights(profile.qualityWeights);
  const issueHealthSplit = normalizeIssueHealthSplit(profile.issueHealthSplit);

  const openRatioScore = scoreOpenIssuesRatio(input.openIssuesPercent, profile);
  const resolutionSpeedScore = scoreIssueResolution(
    input.medianIssueResolutionDays,
    input.openIssuesPercent,
    profile,
  );

  const signals = {
    issueHealth:
      openRatioScore * issueHealthSplit.openRatio +
      resolutionSpeedScore * issueHealthSplit.resolutionSpeed,
    releaseHealth: scoreReleaseCadence(input.releasesLastYear, profile),
    community: scorePopularity(input.stars, profile),
    maturity: scoreProjectAge(input.repositoryCreatedAt, now, profile),
    activityBreadth: computeActivityBreadth(
      input,
      now,
      profile.qualityThresholds.activityBreadthFractions,
    ),
  };

  const weightedScore01 =
    signals.issueHealth * normalizedWeights.issueHealth +
    signals.releaseHealth * normalizedWeights.releaseHealth +
    signals.community * normalizedWeights.community +
    signals.maturity * normalizedWeights.maturity +
    signals.activityBreadth * normalizedWeights.activityBreadth;

  return {
    quality: Math.round(weightedScore01 * 100),
    signals,
    normalizedWeights,
  };
}
