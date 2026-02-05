import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { ANALYSIS_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getProjectTag } from "@/lib/cache/tags";
import { ensureScoreCompletion } from "@/lib/services/assessment-service";
import { CommitActivityChart } from "./commit-activity-chart";

interface CommitChartContentProps {
  runId: number;
  owner: string;
  project: string;
}

export async function CommitChartContent({
  runId,
  owner,
  project,
}: CommitChartContentProps) {
  "use cache";
  cacheLife(ANALYSIS_CACHE_LIFE);
  cacheTag(getProjectTag(owner, project));

  const run = await ensureScoreCompletion(owner, project, runId);
  const commitActivity = run.commitActivity;
  const commitsLastYear = commitActivity.reduce(
    (sum, week) => sum + week.commits,
    0,
  );

  return (
    <CommitActivityChart
      commitActivity={commitActivity}
      commitsLastYear={commitsLastYear}
    />
  );
}
