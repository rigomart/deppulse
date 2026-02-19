import type { Doc } from "../_generated/dataModel";

/**
 * Maps Convex repository + analysis run docs to a flat shape
 * suitable for consumption by the Next.js layer.
 *
 * The Next.js layer can consume these directly — the shape matches
 * the updated domain types (id: string, timestamps: number).
 */

export function mapRepository(doc: Doc<"repositories">) {
  return {
    id: doc._id,
    owner: doc.owner,
    name: doc.name,
    fullName: doc.fullName,
    defaultBranch: doc.defaultBranch ?? null,
    createdAt: doc._creationTime,
    updatedAt: doc._creationTime,
  };
}

export function mapAnalysisRun(
  run: Doc<"analysisRuns">,
  repository: Doc<"repositories">,
) {
  return {
    id: run._id,
    repository: mapRepository(repository),
    status: run.status,
    runState: run.runState,
    progressStep: run.progressStep,
    attemptCount: run.attemptCount,
    triggerSource: run.triggerSource,
    updatedAt: run.updatedAt,
    metrics: run.metricsJson ?? null,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
    errorCode: run.errorCode ?? null,
    errorMessage: run.errorMessage ?? null,
  };
}
