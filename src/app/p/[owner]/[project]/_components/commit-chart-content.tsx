import "server-only";

import { ensureScoreCompletion } from "@/lib/services/assessment-service";
import { CommitActivityChart } from "./commit-activity-chart";

interface CommitChartContentProps {
  owner: string;
  project: string;
}

export async function CommitChartContent({
  owner,
  project,
}: CommitChartContentProps) {
  const run = await ensureScoreCompletion(owner, project);
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
