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
    runState: run.runState,
    progressStep: run.progressStep,
    attemptCount: run.attemptCount,
    nextRetryAt: run.nextRetryAt ?? null,
    lockToken: run.lockToken ?? null,
    lockedAt: run.lockedAt ?? null,
    workflowId: run.workflowId ?? null,
    triggerSource: run.triggerSource,
    updatedAt: run.updatedAt,
    metrics: run.metricsJson ?? null,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
    errorCode: run.errorCode ?? null,
    errorMessage: run.errorMessage ?? null,
  };
}
