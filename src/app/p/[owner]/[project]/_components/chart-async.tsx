import "server-only";

import { ensureScoreCompletion } from "@/lib/services/assessment-service";
import { CommitActivityChart } from "./commit-activity-chart";

interface ChartAsyncProps {
  owner: string;
  project: string;
}

/**
 * Async component that renders the commit activity chart.
 * Ensures commit activity is available via the assessment service.
 */
export async function ChartAsync({ owner, project }: ChartAsyncProps) {
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
