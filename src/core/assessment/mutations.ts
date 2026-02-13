import "server-only";

import { fetchRepoMetrics } from "@/adapters/github";
import { createAssessmentRun } from "@/adapters/persistence/analysis-run";
import { upsertRepository } from "@/adapters/persistence/repository";
import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { findLatestAssessmentRunBySlug } from "./queries";
import { toMetricsSnapshot } from "./snapshot-mapper";

export async function ensureAssessmentRunStarted(
  owner: string,
  project: string,
): Promise<AnalysisRun> {
  const latest = await findLatestAssessmentRunBySlug(owner, project);
  if (latest && isAnalysisFresh(latest)) {
    return latest;
  }

  const metrics = await fetchRepoMetrics(owner, project);
  const repository = await upsertRepository({
    owner,
    name: project,
    fullName: metrics.fullName,
    defaultBranch: metrics.defaultBranch ?? null,
  });

  const now = new Date();
  const run = await createAssessmentRun({
    repositoryId: repository.id,
    status: "complete",
    metrics: toMetricsSnapshot(metrics),
    startedAt: now,
    completedAt: now,
  });

  return run;
}
