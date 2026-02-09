import type { AnalysisRun, Repository } from "@/db/schema";
import type { AnalysisRun as DomainAnalysisRun } from "@/lib/domain/assessment";
import { mapRepositoryRow } from "../repository/mappers";

export type AnalysisRunWithRepository = AnalysisRun & {
  repository: Repository;
};

export function mapAnalysisRunRow(
  run: AnalysisRunWithRepository,
): DomainAnalysisRun {
  return {
    id: run.id,
    repository: mapRepositoryRow(run.repository),
    status: run.status,
    metrics: run.metricsJson ?? null,
    commitActivity: run.commitActivityJson ?? [],
    score: run.score ?? null,
    category: run.category ?? null,
    scoreBreakdown: run.scoreBreakdownJson ?? null,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
    errorCode: run.errorCode ?? null,
    errorMessage: run.errorMessage ?? null,
  };
}
