import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { commitActivityPoints, projectViews } from "@/db/schema";
import type {
  AnalysisRunProgressStep,
  AnalysisRunState,
  CommitActivityWeek,
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
      snapshotJson: input.snapshot ?? undefined,
      analyzedAt: input.analyzedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: projectViews.repositoryId,
      set: {
        latestRunId: input.latestRunId,
        runState: input.runState,
        progressStep: input.progressStep,
        snapshotJson: input.snapshot ?? undefined,
        analyzedAt: input.analyzedAt,
        updatedAt: now,
      },
    });
}

export async function replaceCommitActivityPoints(input: {
  repositoryId: number;
  runId: number;
  weeks: CommitActivityWeek[];
}): Promise<void> {
  await db
    .delete(commitActivityPoints)
    .where(eq(commitActivityPoints.repositoryId, input.repositoryId));

  if (input.weeks.length === 0) return;

  await db.insert(commitActivityPoints).values(
    input.weeks.map((week) => ({
      repositoryId: input.repositoryId,
      runId: input.runId,
      weekStart: new Date(week.weekStart),
      totalCommits: week.totalCommits,
      day0: week.dailyBreakdown[0],
      day1: week.dailyBreakdown[1],
      day2: week.dailyBreakdown[2],
      day3: week.dailyBreakdown[3],
      day4: week.dailyBreakdown[4],
      day5: week.dailyBreakdown[5],
      day6: week.dailyBreakdown[6],
    })),
  );
}
