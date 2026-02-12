import "server-only";

import { isAnalysisFresh } from "@/lib/cache/analysis-cache";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { fetchRepoMetrics } from "@/lib/github";
import { createAssessmentRun } from "@/lib/persistence/analysis-run";
import { upsertRepository } from "@/lib/persistence/repository";
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

  const run = await createAssessmentRun({
    repositoryId: repository.id,
    status: "complete",
    metrics: toMetricsSnapshot(metrics),
    startedAt: new Date(),
    completedAt: new Date(),
  });

  return run;
}
