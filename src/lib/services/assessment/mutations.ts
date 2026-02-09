import "server-only";

import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { fetchCommitActivity, fetchRepoMetrics } from "@/lib/github";
import { calculateMaintenanceScore } from "@/lib/maintenance";
import {
  createAssessmentRun,
  findAssessmentRunById,
  updateAssessmentRun,
} from "@/lib/persistence/analysis-run";
import { upsertRepository } from "@/lib/persistence/repository";
import { findLatestAssessmentRunBySlug } from "./queries";
import { toMetricsSnapshot } from "./snapshot-mapper";

export async function ensureAssessmentRunStarted(
  owner: string,
  project: string,
): Promise<AnalysisRun> {
  const latest = await findLatestAssessmentRunBySlug(owner, project);
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

  const run = await createAssessmentRun({
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

export async function ensureAssessmentRunCompleted(
  owner: string,
  project: string,
  runId?: number,
): Promise<AnalysisRun> {
  const run = runId
    ? await findAssessmentRunById(runId)
    : await findLatestAssessmentRunBySlug(owner, project);

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
    workingRun = await updateAssessmentRun(run.id, { status: "score_pending" });
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

    const completed = await updateAssessmentRun(workingRun.id, {
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
      await updateAssessmentRun(workingRun.id, {
        status: "failed",
        errorMessage,
      });
    } catch {
      // Best-effort status update; proceed to rethrow original error
    }
    throw error;
  }
}
