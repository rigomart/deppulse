import "server-only";

import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import type { AnalysisRun, MetricsSnapshot } from "@/lib/domain/assessment";
import { fetchCommitActivity, fetchRepoMetrics } from "@/lib/github";
import { calculateMaintenanceScore } from "@/lib/maintenance";
import {
  createRun,
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

export async function getRecentAnalyses(limit: number): Promise<AnalysisRun[]> {
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
): Promise<AnalysisRun> {
  const latest = await getLatestRun(owner, project);
  if (latest && isAnalysisFresh(latest)) {
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

  return run;
}

export async function ensureScoreCompletion(
  owner: string,
  project: string,
  runId?: number,
): Promise<AnalysisRun> {
  const run = runId
    ? await getRunById(runId)
    : await getLatestRun(owner, project);

  if (!run) {
    throw new Error("Analysis run not found");
  }

  if (run.status === "complete" && run.score !== null) {
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

    return completed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    try {
      await updateRun(workingRun.id, {
        status: "failed",
        errorMessage,
      });
    } catch {
      // Best-effort status update; proceed to rethrow original error
    }
    throw error;
  }
}
