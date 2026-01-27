import "server-only";

import { cache } from "react";
import { after } from "next/server";
import { fetchCommitActivity, fetchRepoMetrics } from "@/lib/github";
import { calculateMaintenanceScore } from "@/lib/maintenance";
import type {
  AnalysisRun,
  MetricsSnapshot,
} from "@/lib/domain/assessment";
import { invalidateProjectCache } from "@/lib/cache/invalidation";
import { getProjectTag } from "@/lib/cache/tags";
import {
  createRun,
  getCachedLatestRunByRepositoryId,
  getLatestRunByRepositoryId,
  getRecentCompletedRuns,
  getRunById,
  getRunsByRepositoryId,
  updateRun,
} from "@/lib/persistence/analysis-run-repo";
import {
  getRepositoryByFullName,
  upsertRepository,
} from "@/lib/persistence/repository-repo";

const CACHE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

type InvalidationMode = "none" | "immediate" | "defer";

function scheduleInvalidation(
  mode: InvalidationMode,
  owner: string,
  project: string,
) {
  if (mode === "none") {
    return;
  }

  if (mode === "immediate") {
    invalidateProjectCache(owner, project);
    return;
  }

  after(() => {
    invalidateProjectCache(owner, project);
  });
}

function isRunFresh(run: AnalysisRun): boolean {
  const timestamp = run.completedAt ?? run.startedAt;
  const ageSeconds = (Date.now() - timestamp.getTime()) / 1000;
  return ageSeconds < CACHE_REVALIDATE_SECONDS;
}

function toMetricsSnapshot(metrics: {
  description: MetricsSnapshot["description"];
  stars: MetricsSnapshot["stars"];
  forks: MetricsSnapshot["forks"];
  avatarUrl: MetricsSnapshot["avatarUrl"];
  htmlUrl: MetricsSnapshot["htmlUrl"];
  license: MetricsSnapshot["license"];
  language: MetricsSnapshot["language"];
  repositoryCreatedAt: Date | null;
  isArchived: MetricsSnapshot["isArchived"];
  lastCommitAt: Date | null;
  lastReleaseAt: Date | null;
  lastClosedIssueAt: Date | null;
  openIssuesPercent: MetricsSnapshot["openIssuesPercent"];
  openIssuesCount: MetricsSnapshot["openIssuesCount"];
  closedIssuesCount: MetricsSnapshot["closedIssuesCount"];
  medianIssueResolutionDays: MetricsSnapshot["medianIssueResolutionDays"];
  openPrsCount: MetricsSnapshot["openPrsCount"];
  issuesCreatedLastYear: MetricsSnapshot["issuesCreatedLastYear"];
  releases: MetricsSnapshot["releases"];
}): MetricsSnapshot {
  return {
    ...metrics,
    repositoryCreatedAt: metrics.repositoryCreatedAt
      ? metrics.repositoryCreatedAt.toISOString()
      : null,
    lastCommitAt: metrics.lastCommitAt
      ? metrics.lastCommitAt.toISOString()
      : null,
    lastReleaseAt: metrics.lastReleaseAt
      ? metrics.lastReleaseAt.toISOString()
      : null,
    lastClosedIssueAt: metrics.lastClosedIssueAt
      ? metrics.lastClosedIssueAt.toISOString()
      : null,
  };
}

export async function getCachedLatestRun(
  owner: string,
  project: string,
): Promise<AnalysisRun | null> {
  const fullName = `${owner}/${project}`;
  const repository = await getRepositoryByFullName(fullName);

  if (!repository) {
    return null;
  }

  return getCachedLatestRunByRepositoryId(
    repository.id,
    getProjectTag(owner, project),
  );
}

export async function getLatestRun(
  owner: string,
  project: string,
): Promise<AnalysisRun | null> {
  const fullName = `${owner}/${project}`;
  const repository = await getRepositoryByFullName(fullName);

  if (!repository) {
    return null;
  }

  return getLatestRunByRepositoryId(repository.id);
}

export const getLatestRunOrAnalyze = cache(
  async (owner: string, project: string): Promise<AnalysisRun> => {
    return startAnalysis(owner, project, { invalidate: "defer" });
  },
);

export async function getRecentAnalyses(
  limit: number,
): Promise<AnalysisRun[]> {
  const runs = await getRecentCompletedRuns(limit * 4);
  const unique: AnalysisRun[] = [];
  const seen = new Set<number>();

  for (const run of runs) {
    if (seen.has(run.repository.id)) continue;
    unique.push(run);
    seen.add(run.repository.id);
    if (unique.length >= limit) break;
  }

  return unique;
}

export async function getRunHistory(
  owner: string,
  project: string,
  limit: number,
): Promise<AnalysisRun[]> {
  const fullName = `${owner}/${project}`;
  const repository = await getRepositoryByFullName(fullName);

  if (!repository) {
    return [];
  }

  return getRunsByRepositoryId(repository.id, limit);
}

export async function startAnalysis(
  owner: string,
  project: string,
  options: { invalidate?: InvalidationMode } = {},
): Promise<AnalysisRun> {
  const latest = await getLatestRun(owner, project);
  if (latest && isRunFresh(latest)) {
    return latest;
  }

  const metrics = await fetchRepoMetrics(owner, project);
  const repository = await upsertRepository({
    owner,
    name: project,
    fullName: metrics.fullName,
    defaultBranch: metrics.defaultBranch ?? null,
  });

  const run = await createRun({
    repositoryId: repository.id,
    status: "metrics_fetched",
    metrics: toMetricsSnapshot(metrics),
    commitActivity: [],
    score: null,
    category: null,
    scoreBreakdown: null,
    startedAt: new Date(),
  });

  scheduleInvalidation(options.invalidate ?? "immediate", owner, project);

  return run;
}

export async function ensureScoreCompletion(
  owner: string,
  project: string,
  runId?: number,
  options: { invalidate?: InvalidationMode } = {},
): Promise<AnalysisRun> {
  const run = runId ? await getRunById(runId) : await getLatestRun(owner, project);

  if (!run) {
    throw new Error("Analysis run not found");
  }

  if (
    run.status === "complete" &&
    run.score !== null &&
    run.commitActivity.length > 0
  ) {
    return run;
  }

  if (!run.metrics) {
    throw new Error("Metrics snapshot missing for analysis run.");
  }

  let workingRun = run;

  if (run.status !== "score_pending" && run.status !== "complete") {
    workingRun = await updateRun(run.id, { status: "score_pending" });
  }

  try {
    const commitActivity =
      run.commitActivity.length > 0
        ? run.commitActivity
        : await fetchCommitActivity(owner, project);

    const result = calculateMaintenanceScore({
      lastCommitAt: run.metrics.lastCommitAt
        ? new Date(run.metrics.lastCommitAt)
        : null,
      commitActivity,
      openIssuesPercent: run.metrics.openIssuesPercent,
      medianIssueResolutionDays: run.metrics.medianIssueResolutionDays,
      issuesCreatedLastYear: run.metrics.issuesCreatedLastYear,
      lastReleaseAt: run.metrics.lastReleaseAt
        ? new Date(run.metrics.lastReleaseAt)
        : null,
      repositoryCreatedAt: run.metrics.repositoryCreatedAt
        ? new Date(run.metrics.repositoryCreatedAt)
        : null,
      openPrsCount: run.metrics.openPrsCount,
      stars: run.metrics.stars,
      forks: run.metrics.forks,
      isArchived: run.metrics.isArchived,
    });

    const completed = await updateRun(workingRun.id, {
      status: "complete",
      commitActivity,
      score: result.score,
      category: result.category,
      scoreBreakdown: { maturityTier: result.maturityTier },
      completedAt: new Date(),
    });

    scheduleInvalidation(options.invalidate ?? "defer", owner, project);

    return completed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateRun(workingRun.id, {
      status: "failed",
      errorMessage,
    });
    throw error;
  }
}
