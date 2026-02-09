import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { analysisRuns } from "@/db/schema";
import type { AnalysisRun as DomainAnalysisRun } from "@/lib/domain/assessment";
import { type AnalysisRunWithRepository, mapAnalysisRunRow } from "./mappers";

export async function findAssessmentRunById(
  id: number,
): Promise<DomainAnalysisRun | null> {
  const run = await db.query.analysisRuns.findFirst({
    where: eq(analysisRuns.id, id),
    with: { repository: true },
  });

  return run ? mapAnalysisRunRow(run as AnalysisRunWithRepository) : null;
}

export async function findLatestAssessmentRunByRepositoryId(
  repositoryId: number,
): Promise<DomainAnalysisRun | null> {
  const run = await db.query.analysisRuns.findFirst({
    where: eq(analysisRuns.repositoryId, repositoryId),
    orderBy: [desc(analysisRuns.startedAt)],
    with: { repository: true },
  });

  return run ? mapAnalysisRunRow(run as AnalysisRunWithRepository) : null;
}

export async function listAssessmentRunsByRepositoryId(
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

export async function listRecentCompletedAssessmentRuns(
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
