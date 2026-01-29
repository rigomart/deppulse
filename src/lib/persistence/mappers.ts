import type { AnalysisRun, Repository } from "@/db/schema";
import type { AnalysisRun as DomainAnalysisRun } from "@/lib/domain/assessment";
import type { RepositoryRef } from "@/lib/domain/repository";

export type AnalysisRunWithRepository = AnalysisRun & {
  repository: Repository;
};

export function mapRepositoryRow(repository: Repository): RepositoryRef {
  return {
    id: repository.id,
    owner: repository.owner,
    name: repository.name,
    fullName: repository.fullName,
    defaultBranch: repository.defaultBranch,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
  };
}

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
