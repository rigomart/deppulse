import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { analysisRuns } from "@/db/schema";
import type { AnalysisRun as DomainAnalysisRun } from "@/lib/domain/assessment";
import { findAssessmentRunById } from "./queries";

export async function createAssessmentRun(input: {
  repositoryId: number;
  status: DomainAnalysisRun["status"];
  metrics: DomainAnalysisRun["metrics"] | null;
  commitActivity: DomainAnalysisRun["commitActivity"] | null;
  score: DomainAnalysisRun["score"];
  category: DomainAnalysisRun["category"];
  scoreBreakdown: DomainAnalysisRun["scoreBreakdown"] | null;
  startedAt?: Date;
  completedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<DomainAnalysisRun> {
  const [run] = await db
    .insert(analysisRuns)
    .values({
      repositoryId: input.repositoryId,
      status: input.status,
      metricsJson: input.metrics ?? undefined,
      commitActivityJson: input.commitActivity ?? undefined,
      score: input.score,
      category: input.category ?? undefined,
      scoreBreakdownJson: input.scoreBreakdown ?? undefined,
      startedAt: input.startedAt ?? new Date(),
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
    metrics?: DomainAnalysisRun["metrics"] | null;
    commitActivity?: DomainAnalysisRun["commitActivity"] | null;
    score?: DomainAnalysisRun["score"];
    category?: DomainAnalysisRun["category"];
    scoreBreakdown?: DomainAnalysisRun["scoreBreakdown"] | null;
    completedAt?: Date | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
): Promise<DomainAnalysisRun> {
  await db
    .update(analysisRuns)
    .set({
      status: updates.status,
      metricsJson: updates.metrics ?? undefined,
      commitActivityJson: updates.commitActivity ?? undefined,
      score: updates.score,
      category: updates.category ?? undefined,
      scoreBreakdownJson: updates.scoreBreakdown ?? undefined,
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
