import "server-only";

import { DrizzleQueryError } from "drizzle-orm/errors";
import {
  createAssessmentRun,
  findActiveAssessmentRunByRepositoryId,
  findLatestAssessmentRunByRepositoryId,
} from "@/adapters/persistence/analysis-run";
import {
  findRepositoryByFullName,
  upsertRepository,
} from "@/adapters/persistence/repository";
import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import type {
  AnalysisRun,
  AnalysisRunTriggerSource,
} from "@/lib/domain/assessment";

function normalizeRepoInput(
  owner: string,
  project: string,
): {
  owner: string;
  project: string;
  fullName: string;
} {
  const normalizedOwner = owner.trim().toLowerCase();
  const normalizedProject = project.trim().toLowerCase();
  return {
    owner: normalizedOwner,
    project: normalizedProject,
    fullName: `${normalizedOwner}/${normalizedProject}`,
  };
}

function isActiveRunConstraintError(error: unknown): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  if (!cause || typeof cause !== "object") return false;

  const code = "code" in cause ? cause.code : null;
  const constraint = "constraint" in cause ? cause.constraint : null;

  return (
    code === "23505" && constraint === "analysis_runs_repository_active_idx"
  );
}

export async function startOrReuseAnalysisRun(input: {
  owner: string;
  project: string;
  force?: boolean;
  triggerSource?: AnalysisRunTriggerSource;
}): Promise<{ run: AnalysisRun; created: boolean }> {
  const normalized = normalizeRepoInput(input.owner, input.project);
  const repository = await findRepositoryByFullName(normalized.fullName);

  if (repository && !input.force) {
    const active = await findActiveAssessmentRunByRepositoryId(repository.id);
    if (active) {
      return { run: active, created: false };
    }

    const latest = await findLatestAssessmentRunByRepositoryId(repository.id);
    if (latest && isAnalysisFresh(latest) && latest.status === "complete") {
      return { run: latest, created: false };
    }
  }

  const upsertedRepository = await upsertRepository({
    owner: normalized.owner,
    name: normalized.project,
    fullName: normalized.fullName,
    defaultBranch: repository?.defaultBranch ?? null,
  });

  if (!input.force) {
    const active = await findActiveAssessmentRunByRepositoryId(
      upsertedRepository.id,
    );
    if (active) {
      return { run: active, created: false };
    }
  }

  const now = new Date();
  const lockToken = crypto.randomUUID();

  try {
    const run = await createAssessmentRun({
      repositoryId: upsertedRepository.id,
      status: "queued",
      runState: "queued",
      progressStep: "bootstrap",
      attemptCount: 0,
      nextRetryAt: null,
      lockToken,
      lockedAt: null,
      triggerSource: input.triggerSource ?? "system",
      workflowId: null,
      metrics: null,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      errorCode: null,
      errorMessage: null,
    });

    return { run, created: true };
  } catch (error) {
    if (isActiveRunConstraintError(error)) {
      const active = await findActiveAssessmentRunByRepositoryId(
        upsertedRepository.id,
      );
      if (active) {
        return { run: active, created: false };
      }
    }

    throw error;
  }
}
