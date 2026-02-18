import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { analysisRuns } from "@/db/schema";
import type { AnalysisRun as DomainAnalysisRun } from "@/lib/domain/assessment";
import { findAssessmentRunById } from "./queries";

export async function createAssessmentRun(input: {
  repositoryId: number;
  status: DomainAnalysisRun["status"];
  runState?: DomainAnalysisRun["runState"];
  progressStep?: DomainAnalysisRun["progressStep"];
  attemptCount?: number;
  nextRetryAt?: Date | null;
  lockToken?: string | null;
  lockedAt?: Date | null;
  workflowId?: string | null;
  triggerSource?: DomainAnalysisRun["triggerSource"];
  metrics: DomainAnalysisRun["metrics"] | null;
  startedAt?: Date;
  updatedAt?: Date;
  completedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<DomainAnalysisRun> {
  const [run] = await db
    .insert(analysisRuns)
    .values({
      repositoryId: input.repositoryId,
      status: input.status,
      runState: input.runState ?? "complete",
      progressStep: input.progressStep ?? "finalize",
      attemptCount: input.attemptCount ?? 0,
      nextRetryAt: input.nextRetryAt ?? null,
      lockToken: input.lockToken ?? null,
      lockedAt: input.lockedAt ?? null,
      workflowId: input.workflowId ?? null,
      triggerSource: input.triggerSource ?? "system",
      metricsJson: input.metrics ?? undefined,
      startedAt: input.startedAt ?? new Date(),
      updatedAt: input.updatedAt ?? new Date(),
      completedAt: input.completedAt ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    })
    .returning();

  const hydrated = await findAssessmentRunById(run.id);
  if (!hydrated) {
    throw new Error("Failed to load created analysis run.");
  }

  return hydrated;
}

export async function updateAssessmentRun(
  id: number,
  updates: {
    status?: DomainAnalysisRun["status"];
    runState?: DomainAnalysisRun["runState"];
    progressStep?: DomainAnalysisRun["progressStep"];
    attemptCount?: number;
    nextRetryAt?: Date | null;
    lockToken?: string | null;
    lockedAt?: Date | null;
    workflowId?: string | null;
    triggerSource?: DomainAnalysisRun["triggerSource"];
    metrics?: DomainAnalysisRun["metrics"] | null;
    updatedAt?: Date;
    completedAt?: Date | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
): Promise<DomainAnalysisRun> {
  await db
    .update(analysisRuns)
    .set({
      status: updates.status,
      runState: updates.runState,
      progressStep: updates.progressStep,
      attemptCount: updates.attemptCount,
      nextRetryAt: updates.nextRetryAt,
      lockToken: updates.lockToken,
      lockedAt: updates.lockedAt,
      workflowId: updates.workflowId,
      triggerSource: updates.triggerSource,
      metricsJson: updates.metrics ?? undefined,
      updatedAt: updates.updatedAt ?? new Date(),
      completedAt: updates.completedAt ?? undefined,
      errorCode: updates.errorCode ?? undefined,
      errorMessage: updates.errorMessage ?? undefined,
    })
    .where(eq(analysisRuns.id, id));

  const hydrated = await findAssessmentRunById(id);
  if (!hydrated) {
    throw new Error("Failed to load updated analysis run.");
  }

  return hydrated;
}
