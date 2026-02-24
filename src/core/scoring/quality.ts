import { normalizeIssueHealthSplit, normalizeQualityWeights } from "./profiles";
import { computeActivityBreadth } from "./signals";
import type { QualityComputation, ScoringInput, ScoringProfile } from "./types";

type AnchorPoint = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function interpolateLinear(
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  if (x1 <= x0) return y1;
  const t = clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + (y1 - y0) * t;
}

function interpolateFromAnchors(x: number, anchors: AnchorPoint[]): number {
  const first = anchors[0];
  if (!first) return 0;
  if (x <= first.x) return first.y;

  for (let index = 1; index < anchors.length; index++) {
    const previous = anchors[index - 1];
    const current = anchors[index];
    if (!previous || !current) continue;

    if (x <= current.x) {
      return interpolateLinear(x, previous.x, current.x, previous.y, current.y);
    }
  }

  return anchors.at(-1)?.y ?? 0;
}

function interpolateLog(
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  if (x <= 0 || x0 <= 0 || x1 <= 0) {
    return interpolateLinear(x, x0, x1, y0, y1);
  }

  const logX = Math.log10(x);
  const logX0 = Math.log10(x0);
  const logX1 = Math.log10(x1);
  if (logX1 <= logX0) return y1;

  const t = clamp((logX - logX0) / (logX1 - logX0), 0, 1);
  return y0 + (y1 - y0) * t;
}

function interpolateFromAnchorsLog(x: number, anchors: AnchorPoint[]): number {
  const first = anchors[0];
  if (!first) return 0;
  if (x <= first.x) return first.y;

  for (let index = 1; index < anchors.length; index++) {
    const previous = anchors[index - 1];
    const current = anchors[index];
    if (!previous || !current) continue;

    if (x <= current.x) {
      return interpolateLog(x, previous.x, current.x, previous.y, current.y);
    }
  }

  return anchors.at(-1)?.y ?? 0;
}

function scoreOpenIssuesRatio(
  openIssuesPercent: number | null,
  profile: ScoringProfile,
): number {
  const thresholds = profile.qualityThresholds.openIssuesRatio;

  if (openIssuesPercent === null) return 0.5;

  return interpolateFromAnchors(openIssuesPercent, [
    { x: thresholds.excellent, y: 1 },
    { x: thresholds.good, y: 0.7 },
    { x: thresholds.fair, y: 0.4 },
    { x: thresholds.poor, y: 0.15 },
    { x: 100, y: 0 },
  ]);
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

  return interpolateFromAnchors(resolutionDays, [
    { x: thresholds.excellent, y: 1 },
    { x: thresholds.good, y: 0.8 },
    { x: thresholds.fair, y: 0.5 },
    { x: thresholds.poor, y: 0.25 },
    { x: thresholds.poor * 2, y: 0 },
  ]);
}

function scoreReleaseCadence(
  releasesLastYear: number,
  releaseRegularity: number | null,
  lastReleaseAt: Date | null,
  now: Date,
  profile: ScoringProfile,
): number {
  const thresholds = profile.qualityThresholds.releaseCadencePerYear;
  const cadenceScore = interpolateFromAnchors(releasesLastYear, [
    { x: 0, y: 0 },
    { x: thresholds.fair, y: 0.4 },
    { x: thresholds.good, y: 0.75 },
    { x: thresholds.excellent, y: 1 },
  ]);

  if (!lastReleaseAt) return cadenceScore;

  const daysSinceLastRelease =
    (now.getTime() - lastReleaseAt.getTime()) / (24 * 60 * 60 * 1000);

  const recencyMultiplier = interpolateFromAnchors(daysSinceLastRelease, [
    { x: 0, y: 1 },
    { x: 180, y: 1 },
    { x: 365, y: 0.8 },
    { x: 730, y: 0.5 },
  ]);

  const regularityMultiplier =
    releaseRegularity === null
      ? 1
      : interpolateFromAnchors(releaseRegularity, [
          { x: 0, y: 0.7 },
          { x: 0.5, y: 0.9 },
          { x: 1, y: 1 },
        ]);

  return cadenceScore * recencyMultiplier * regularityMultiplier;
}

function scorePopularity(stars: number, profile: ScoringProfile): number {
  const thresholds = profile.qualityThresholds.popularityStars;
  if (stars <= 0) return 0.1;

  if (stars < thresholds.minimal) {
    return interpolateLinear(stars, 0, thresholds.minimal, 0.1, 0.3);
  }

  return interpolateFromAnchorsLog(stars, [
    { x: thresholds.minimal, y: 0.3 },
    { x: thresholds.poor, y: 0.5 },
    { x: thresholds.fair, y: 0.7 },
    { x: thresholds.good, y: 0.85 },
    { x: thresholds.excellent, y: 1 },
  ]);
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

  return interpolateFromAnchors(ageYears, [
    { x: 0, y: 0.1 },
    { x: thresholds.newer, y: 0.3 },
    { x: thresholds.growing, y: 0.6 },
    { x: thresholds.established, y: 0.8 },
    { x: thresholds.mature, y: 1 },
  ]);
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
    releaseHealth: scoreReleaseCadence(
      input.releasesLastYear,
      input.releaseRegularity ?? null,
      input.lastReleaseAt,
      now,
      profile,
    ),
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
