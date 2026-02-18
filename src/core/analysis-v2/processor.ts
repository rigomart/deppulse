import "server-only";

import { fetchCommitActivity, fetchRepoMetrics } from "@/adapters/github";
import {
  findAssessmentRunById,
  listDueRetryAssessmentRuns,
  updateAssessmentRun,
} from "@/adapters/persistence/analysis-run";
import {
  replaceCommitActivityPoints,
  upsertProjectView,
} from "@/adapters/persistence/project-view";
import { toMetricsSnapshot } from "@/core/assessment/snapshot-mapper";
import {
  invalidateProjectCache,
  invalidateRecentAnalysesCache,
} from "@/lib/cache/invalidation";
import { featureFlags } from "@/lib/config/feature-flags";
import type {
  CommitActivity,
  CommitActivityWeek,
  MetricsSnapshot,
} from "@/lib/domain/assessment";
import { logger } from "@/lib/logger";
import {
  COMMIT_ACTIVITY_MAX_ATTEMPTS,
  COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS,
  isTerminalRunState,
  sleep,
} from "./constants";

function mapCommitActivityWeeks(
  weeks: Array<{
    week: number;
    total: number;
    days: [number, number, number, number, number, number, number];
  }>,
): CommitActivityWeek[] {
  return weeks.map((week) => ({
    weekStart: new Date(week.week * 1000).toISOString(),
    totalCommits: week.total,
    dailyBreakdown: week.days,
  }));
}

function updateCommitActivity(
  snapshot: MetricsSnapshot,
  updates: Partial<CommitActivity>,
): MetricsSnapshot {
  const previous: CommitActivity = snapshot.commitActivity ?? {
    state: "pending",
    attempts: 0,
    lastAttemptedAt: null,
    errorMessage: null,
    weekly: [],
  };

  return {
    ...snapshot,
    commitActivity: {
      ...previous,
      ...updates,
    },
  };
}

async function syncProjectViewFromRun(input: {
  repositoryId: number;
  runId: number;
  runState:
    | "queued"
    | "running"
    | "waiting_retry"
    | "complete"
    | "failed"
    | "partial";
  progressStep: "bootstrap" | "metrics" | "commit_activity" | "finalize";
  snapshot: MetricsSnapshot | null;
  analyzedAt: Date | null;
}): Promise<void> {
  if (!featureFlags.analysisV2ReadModel) return;

  try {
    await upsertProjectView({
      repositoryId: input.repositoryId,
      latestRunId: input.runId,
      runState: input.runState,
      progressStep: input.progressStep,
      snapshot: input.snapshot,
      analyzedAt: input.analyzedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Project view sync failed", {
      runId: input.runId,
      repositoryId: input.repositoryId,
      error: message,
    });
  }
}

async function finalizeRunAndInvalidate(input: {
  runId: number;
  repositoryId: number;
  owner: string;
  project: string;
  status: "complete" | "failed" | "partial";
  runState: "complete" | "failed" | "partial";
  metrics: MetricsSnapshot | null;
  attemptCount: number;
  errorMessage?: string | null;
  errorCode?: string | null;
}): Promise<void> {
  const now = new Date();
  await updateAssessmentRun(input.runId, {
    status: input.status,
    runState: input.runState,
    progressStep: "finalize",
    completedAt: now,
    updatedAt: now,
    metrics: input.metrics,
    attemptCount: input.attemptCount,
    nextRetryAt: null,
    lockedAt: null,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });

  if (featureFlags.analysisV2ReadModel) {
    try {
      await syncProjectViewFromRun({
        repositoryId: input.repositoryId,
        runId: input.runId,
        runState: input.runState,
        progressStep: "finalize",
        snapshot: input.metrics,
        analyzedAt: now,
      });

      const weeks = input.metrics?.commitActivity?.weekly ?? [];
      await replaceCommitActivityPoints({
        repositoryId: input.repositoryId,
        runId: input.runId,
        weeks,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Read-model commit activity write failed", {
        runId: input.runId,
        repositoryId: input.repositoryId,
        error: message,
      });
    }
  }

  try {
    invalidateProjectCache(input.owner, input.project);
    invalidateRecentAnalysesCache();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Cache invalidation failed after run finalize", {
      runId: input.runId,
      owner: input.owner,
      project: input.project,
      error: message,
    });
  }
}

async function resolveCommitActivity(
  runId: number,
  repositoryId: number,
  owner: string,
  project: string,
  snapshot: MetricsSnapshot,
): Promise<{
  status: "complete" | "partial";
  snapshot: MetricsSnapshot;
  attempts: number;
}> {
  let workingSnapshot = snapshot;

  for (
    let attemptIndex = 0;
    attemptIndex < COMMIT_ACTIVITY_MAX_ATTEMPTS;
    attemptIndex++
  ) {
    const attemptNumber = attemptIndex + 1;
    const now = new Date();
    const result = await fetchCommitActivity(owner, project);

    if (result.status === 200) {
      const weekly = mapCommitActivityWeeks(result.weeks);
      workingSnapshot = updateCommitActivity(workingSnapshot, {
        state: "ready",
        attempts: attemptNumber,
        lastAttemptedAt: now.toISOString(),
        errorMessage: null,
        weekly,
      });

      return {
        status: "complete",
        snapshot: workingSnapshot,
        attempts: attemptNumber,
      };
    }

    if (result.status === 403 || result.status === 404) {
      workingSnapshot = updateCommitActivity(workingSnapshot, {
        state: "failed",
        attempts: attemptNumber,
        lastAttemptedAt: now.toISOString(),
        errorMessage:
          "GitHub commit activity is currently unavailable for this repository.",
        weekly: [],
      });
      return {
        status: "partial",
        snapshot: workingSnapshot,
        attempts: attemptNumber,
      };
    }

    const hasNextAttempt = attemptIndex < COMMIT_ACTIVITY_MAX_ATTEMPTS - 1;
    if (!hasNextAttempt) {
      workingSnapshot = updateCommitActivity(workingSnapshot, {
        state: "failed",
        attempts: attemptNumber,
        lastAttemptedAt: now.toISOString(),
        errorMessage:
          "Commit activity did not become available before retry limit was reached.",
        weekly: [],
      });
      return {
        status: "partial",
        snapshot: workingSnapshot,
        attempts: attemptNumber,
      };
    }

    const delaySeconds = COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS[attemptIndex];
    const nextRetryAt = new Date(now.getTime() + delaySeconds * 1000);
    workingSnapshot = updateCommitActivity(workingSnapshot, {
      state: "pending",
      attempts: attemptNumber,
      lastAttemptedAt: now.toISOString(),
      weekly: [],
    });

    await updateAssessmentRun(runId, {
      status: "running",
      runState: "waiting_retry",
      progressStep: "commit_activity",
      attemptCount: attemptNumber,
      nextRetryAt,
      updatedAt: now,
      metrics: workingSnapshot,
    });

    await syncProjectViewFromRun({
      repositoryId,
      runId,
      runState: "waiting_retry",
      progressStep: "commit_activity",
      snapshot: workingSnapshot,
      analyzedAt: null,
    });

    await sleep(delaySeconds * 1000);

    await updateAssessmentRun(runId, {
      status: "running",
      runState: "running",
      progressStep: "commit_activity",
      updatedAt: new Date(),
      nextRetryAt: null,
    });
  }

  return {
    status: "partial",
    snapshot: workingSnapshot,
    attempts: COMMIT_ACTIVITY_MAX_ATTEMPTS,
  };
}

export async function processAnalysisRun(
  runId: number,
  lockToken?: string | null,
): Promise<void> {
  let run = await findAssessmentRunById(runId);
  if (!run) return;
  try {
    const primedRun = await primeRunWithBaseMetrics(runId, lockToken);
    if (!primedRun) return;
    run = primedRun;
    if (isTerminalRunState(run.runState)) return;

    const owner = run.repository.owner;
    const project = run.repository.name;
    const baseSnapshot = run.metrics;

    if (!baseSnapshot) {
      throw new Error("Run is missing base metrics after priming.");
    }

    const commitActivityResult = await resolveCommitActivity(
      run.id,
      run.repository.id,
      owner,
      project,
      baseSnapshot,
    );

    if (commitActivityResult.status === "complete") {
      await finalizeRunAndInvalidate({
        runId: run.id,
        repositoryId: run.repository.id,
        owner,
        project,
        status: "complete",
        runState: "complete",
        metrics: commitActivityResult.snapshot,
        attemptCount: commitActivityResult.attempts,
      });
      return;
    }

    await finalizeRunAndInvalidate({
      runId: run.id,
      repositoryId: run.repository.id,
      owner,
      project,
      status: "partial",
      runState: "partial",
      metrics: commitActivityResult.snapshot,
      attemptCount: commitActivityResult.attempts,
      errorCode: "commit_activity_unavailable",
      errorMessage: commitActivityResult.snapshot.commitActivity?.errorMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Analysis run failed", { runId, error: message });
    const latestRun = await findAssessmentRunById(runId);
    if (!latestRun) return;

    try {
      await finalizeRunAndInvalidate({
        runId: latestRun.id,
        repositoryId: latestRun.repository.id,
        owner: latestRun.repository.owner,
        project: latestRun.repository.name,
        status: "failed",
        runState: "failed",
        metrics: latestRun.metrics,
        attemptCount: latestRun.attemptCount ?? 0,
        errorCode: "analysis_failed",
        errorMessage: message,
      });
    } catch (finalizeError) {
      const finalizeMessage =
        finalizeError instanceof Error
          ? finalizeError.message
          : String(finalizeError);
      logger.error("Failed to finalize failed analysis run", {
        runId,
        error: finalizeMessage,
      });
    }
  }
}

export async function primeRunWithBaseMetrics(
  runId: number,
  lockToken?: string | null,
) {
  const run = await findAssessmentRunById(runId);
  if (!run) return null;
  if (isTerminalRunState(run.runState)) return run;
  if (lockToken && run.lockToken && run.lockToken !== lockToken) return run;

  if (run.metrics && run.progressStep !== "bootstrap") {
    return run;
  }

  const owner = run.repository.owner;
  const project = run.repository.name;

  await updateAssessmentRun(run.id, {
    status: "running",
    runState: "running",
    progressStep: "metrics",
    workflowId: lockToken ?? run.workflowId ?? null,
    lockToken: run.lockToken ?? lockToken ?? crypto.randomUUID(),
    lockedAt: new Date(),
    updatedAt: new Date(),
    errorCode: null,
    errorMessage: null,
  });

  const metrics = await fetchRepoMetrics(owner, project);
  const baseSnapshot = toMetricsSnapshot({
    ...metrics,
    commitActivity: {
      state: "pending",
      attempts: 0,
      lastAttemptedAt: null,
      errorMessage: null,
      weekly: [],
    },
  });

  await updateAssessmentRun(run.id, {
    status: "running",
    runState: "running",
    progressStep: "commit_activity",
    metrics: baseSnapshot,
    updatedAt: new Date(),
    nextRetryAt: null,
    attemptCount: 0,
  });

  await syncProjectViewFromRun({
    repositoryId: run.repository.id,
    runId: run.id,
    runState: "running",
    progressStep: "commit_activity",
    snapshot: baseSnapshot,
    analyzedAt: null,
  });

  const refreshed = await findAssessmentRunById(run.id);
  return refreshed ?? run;
}

export async function triggerAnalysisRunProcessing(input: {
  runId: number;
  lockToken?: string | null;
}): Promise<void> {
  if (featureFlags.analysisV2Workflow) {
    try {
      const [{ start }, { analyzeRepositoryWorkflow }] = await Promise.all([
        import("workflow/api"),
        import("@/workflows/analyze-repository"),
      ]);

      const workflowRun = await start(analyzeRepositoryWorkflow, [
        input.runId,
        input.lockToken ?? null,
      ]);
      await updateAssessmentRun(input.runId, {
        workflowId: workflowRun.runId,
        updatedAt: new Date(),
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Workflow start failed. Falling back to local processor.", {
        runId: input.runId,
        error: message,
      });
    }

    const workflowEndpoint = process.env.ANALYSIS_V2_WORKFLOW_ENDPOINT;
    const workflowToken = process.env.ANALYSIS_V2_WORKFLOW_TOKEN;

    if (workflowEndpoint && workflowToken) {
      const response = await fetch(workflowEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workflowToken}`,
        },
        body: JSON.stringify({
          runId: input.runId,
          lockToken: input.lockToken ?? null,
        }),
      });

      if (response.ok) {
        return;
      }
    }
  }

  await processAnalysisRun(input.runId, input.lockToken ?? null);
}

export async function runFallbackRetryScan(limit = 10): Promise<number> {
  if (!featureFlags.analysisV2FallbackRunner) {
    return 0;
  }

  const dueRuns = await listDueRetryAssessmentRuns(new Date(), limit);
  for (const run of dueRuns) {
    await processAnalysisRun(run.id, run.lockToken ?? run.id.toString());
  }
  return dueRuns.length;
}
