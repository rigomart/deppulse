import "server-only";

import { fetchCommitActivity, fetchRepoMetrics } from "@/adapters/github";
import {
  findAssessmentRunById,
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

type CommitActivityAttemptOutcome =
  | {
      type: "success";
      attempts: number;
      snapshot: MetricsSnapshot;
    }
  | {
      type: "partial";
      attempts: number;
      snapshot: MetricsSnapshot;
      errorCode: string;
      errorMessage: string;
    }
  | {
      type: "retry";
      delaySeconds: number;
    };

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

export async function attemptCommitActivityFetch(
  runId: number,
  attemptNumber: number,
): Promise<CommitActivityAttemptOutcome> {
  const run = await findAssessmentRunById(runId);
  if (!run) {
    throw new Error("Analysis run not found.");
  }

  const snapshot = run.metrics;
  if (!snapshot) {
    throw new Error("Run is missing metrics before commit activity step.");
  }

  const owner = run.repository.owner;
  const project = run.repository.name;
  const now = new Date();
  const result = await fetchCommitActivity(owner, project);

  if (result.status === 200) {
    const workingSnapshot = updateCommitActivity(snapshot, {
      state: "ready",
      attempts: attemptNumber,
      lastAttemptedAt: now.toISOString(),
      errorMessage: null,
      weekly: mapCommitActivityWeeks(result.weeks),
    });

    await updateAssessmentRun(run.id, {
      status: "running",
      runState: "running",
      progressStep: "commit_activity",
      attemptCount: attemptNumber,
      nextRetryAt: null,
      updatedAt: now,
      metrics: workingSnapshot,
    });

    await syncProjectViewFromRun({
      repositoryId: run.repository.id,
      runId: run.id,
      runState: "running",
      progressStep: "commit_activity",
      snapshot: workingSnapshot,
      analyzedAt: null,
    });

    return {
      type: "success",
      attempts: attemptNumber,
      snapshot: workingSnapshot,
    };
  }

  if (result.status === 403 || result.status === 404) {
    const workingSnapshot = updateCommitActivity(snapshot, {
      state: "failed",
      attempts: attemptNumber,
      lastAttemptedAt: now.toISOString(),
      errorMessage:
        "GitHub commit activity is currently unavailable for this repository.",
      weekly: [],
    });

    await updateAssessmentRun(run.id, {
      status: "running",
      runState: "running",
      progressStep: "commit_activity",
      attemptCount: attemptNumber,
      nextRetryAt: null,
      updatedAt: now,
      metrics: workingSnapshot,
    });

    await syncProjectViewFromRun({
      repositoryId: run.repository.id,
      runId: run.id,
      runState: "running",
      progressStep: "commit_activity",
      snapshot: workingSnapshot,
      analyzedAt: null,
    });

    return {
      type: "partial",
      attempts: attemptNumber,
      snapshot: workingSnapshot,
      errorCode: "commit_activity_unavailable",
      errorMessage:
        "GitHub commit activity is currently unavailable for this repository.",
    };
  }

  if (attemptNumber >= COMMIT_ACTIVITY_MAX_ATTEMPTS) {
    const workingSnapshot = updateCommitActivity(snapshot, {
      state: "failed",
      attempts: attemptNumber,
      lastAttemptedAt: now.toISOString(),
      errorMessage:
        "Commit activity did not become available before retry limit was reached.",
      weekly: [],
    });

    await updateAssessmentRun(run.id, {
      status: "running",
      runState: "running",
      progressStep: "commit_activity",
      attemptCount: attemptNumber,
      nextRetryAt: null,
      updatedAt: now,
      metrics: workingSnapshot,
    });

    await syncProjectViewFromRun({
      repositoryId: run.repository.id,
      runId: run.id,
      runState: "running",
      progressStep: "commit_activity",
      snapshot: workingSnapshot,
      analyzedAt: null,
    });

    return {
      type: "partial",
      attempts: attemptNumber,
      snapshot: workingSnapshot,
      errorCode: "commit_activity_retry_limit",
      errorMessage:
        "Commit activity did not become available before retry limit was reached.",
    };
  }

  const delaySeconds = COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS[attemptNumber - 1];
  const nextRetryAt = new Date(now.getTime() + delaySeconds * 1000);
  const workingSnapshot = updateCommitActivity(snapshot, {
    state: "pending",
    attempts: attemptNumber,
    lastAttemptedAt: now.toISOString(),
    weekly: [],
  });

  await updateAssessmentRun(run.id, {
    status: "running",
    runState: "waiting_retry",
    progressStep: "commit_activity",
    attemptCount: attemptNumber,
    nextRetryAt,
    updatedAt: now,
    metrics: workingSnapshot,
  });

  await syncProjectViewFromRun({
    repositoryId: run.repository.id,
    runId: run.id,
    runState: "waiting_retry",
    progressStep: "commit_activity",
    snapshot: workingSnapshot,
    analyzedAt: null,
  });

  return { type: "retry", delaySeconds };
}

export async function finalizeRunFromCommitOutcome(input: {
  runId: number;
  status: "complete" | "partial";
  snapshot: MetricsSnapshot;
  attempts: number;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const run = await findAssessmentRunById(input.runId);
  if (!run) return;

  await finalizeRunAndInvalidate({
    runId: run.id,
    repositoryId: run.repository.id,
    owner: run.repository.owner,
    project: run.repository.name,
    status: input.status,
    runState: input.status,
    metrics: input.snapshot,
    attemptCount: input.attempts,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
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

async function markRunFailedOnWorkflowStartError(
  runId: number,
  message: string,
): Promise<void> {
  const run = await findAssessmentRunById(runId);
  if (!run || isTerminalRunState(run.runState)) return;

  await finalizeRunAndInvalidate({
    runId: run.id,
    repositoryId: run.repository.id,
    owner: run.repository.owner,
    project: run.repository.name,
    status: "failed",
    runState: "failed",
    metrics: run.metrics,
    attemptCount: run.attemptCount ?? 0,
    errorCode: "workflow_start_failed",
    errorMessage: message,
  });
}

export async function triggerAnalysisRunProcessing(input: {
  runId: number;
  lockToken?: string | null;
}): Promise<void> {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Workflow start failed.", {
      runId: input.runId,
      error: message,
    });

    await markRunFailedOnWorkflowStartError(input.runId, message);
  }
}
