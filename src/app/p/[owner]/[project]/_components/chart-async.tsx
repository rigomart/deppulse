import "server-only";

import { getAssessmentFromDb } from "@/db/queries";
import { fetchCommitActivity } from "@/lib/github";
import { CommitActivityChart } from "./commit-activity-chart";

interface ChartAsyncProps {
  owner: string;
  project: string;
}

/**
 * Async component that renders the commit activity chart.
 * Reads from DB if data exists, otherwise fetches from GitHub.
 * Note: ScoreAsync handles the score calculation and data persistence.
 */
export async function ChartAsync({ owner, project }: ChartAsyncProps) {
  const assessment = await getAssessmentFromDb(owner, project);

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  // If we have commit activity data, render from cache
  if (assessment.commitActivity?.length) {
    // Compute commitsLastYear on-demand from commitActivity
    const commitsLastYear = assessment.commitActivity.reduce(
      (sum, week) => sum + week.commits,
      0,
    );
    return (
      <CommitActivityChart
        commitActivity={assessment.commitActivity}
        commitsLastYear={commitsLastYear}
      />
    );
  }

  // Fallback: fetch commit activity (ScoreAsync should have already done this,
  // but handle the case where chart renders before score completes)
  const commitActivity = await fetchCommitActivity(owner, project);
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
