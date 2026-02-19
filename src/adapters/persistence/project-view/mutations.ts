import "server-only";

import { db } from "@/db/drizzle";
import { projectViews } from "@/db/schema";
import type {
  AnalysisRunProgressStep,
  AnalysisRunState,
  MetricsSnapshot,
} from "@/lib/domain/assessment";

export async function upsertProjectView(input: {
  repositoryId: number;
  latestRunId: number | null;
  runState: AnalysisRunState;
  progressStep: AnalysisRunProgressStep;
  snapshot: MetricsSnapshot | null;
  analyzedAt: Date | null;
  updatedAt?: Date;
}): Promise<void> {
  const now = input.updatedAt ?? new Date();

  await db
    .insert(projectViews)
    .values({
      repositoryId: input.repositoryId,
      latestRunId: input.latestRunId,
      runState: input.runState,
      progressStep: input.progressStep,
      snapshotJson: input.snapshot,
      analyzedAt: input.analyzedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: projectViews.repositoryId,
      set: {
        latestRunId: input.latestRunId,
        runState: input.runState,
        progressStep: input.progressStep,
        snapshotJson: input.snapshot,
        analyzedAt: input.analyzedAt,
        updatedAt: now,
      },
    });
}
