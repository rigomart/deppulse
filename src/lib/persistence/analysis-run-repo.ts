import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { analysisRuns } from "@/db/schema";
import type { AnalysisRun as DomainAnalysisRun } from "@/lib/domain/assessment";
import { type AnalysisRunWithRepository, mapAnalysisRunRow } from "./mappers";

export async function getRunById(
  id: number,
): Promise<DomainAnalysisRun | null> {
  const run = await db.query.analysisRuns.findFirst({
    where: eq(analysisRuns.id, id),
    with: { repository: true },
  });

  return run ? mapAnalysisRunRow(run as AnalysisRunWithRepository) : null;
}

export async function getLatestRunByRepositoryId(
  repositoryId: number,
): Promise<DomainAnalysisRun | null> {
  const run = await db.query.analysisRuns.findFirst({
    where: eq(analysisRuns.repositoryId, repositoryId),
    orderBy: [desc(analysisRuns.startedAt)],
    with: { repository: true },
  });

  return run ? mapAnalysisRunRow(run as AnalysisRunWithRepository) : null;
}

export async function getRunsByRepositoryId(
  repositoryId: number,
  limit: number,
): Promise<DomainAnalysisRun[]> {
  const runs = await db.query.analysisRuns.findMany({
    where: eq(analysisRuns.repositoryId, repositoryId),
    orderBy: [desc(analysisRuns.startedAt)],
    limit,
    with: { repository: true },
  });

  return runs.map((run) => mapAnalysisRunRow(run as AnalysisRunWithRepository));
}

export async function createRun(input: {
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

  const hydrated = await getRunById(run.id);
  if (!hydrated) {
    throw new Error("Failed to load created analysis run.");
  }

  return hydrated;
}

export async function updateRun(
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

  const hydrated = await getRunById(id);
  if (!hydrated) {
    throw new Error("Failed to load updated analysis run.");
  }

  return hydrated;
}

export async function getRecentCompletedRuns(
  limit: number,
): Promise<DomainAnalysisRun[]> {
  const runs = await db.query.analysisRuns.findMany({
    where: eq(analysisRuns.status, "complete"),
    orderBy: [desc(analysisRuns.completedAt)],
    limit,
    with: { repository: true },
  });

  return runs.map((run) => mapAnalysisRunRow(run as AnalysisRunWithRepository));
}
