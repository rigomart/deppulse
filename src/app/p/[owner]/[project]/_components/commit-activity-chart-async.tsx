import { getAssessmentFromDb, updateAssessmentChartData } from "@/db/queries";
import { fetchCommitActivity } from "@/lib/github";
import { CommitActivityChart } from "./commit-activity-chart";

interface CommitActivityChartAsyncProps {
  owner: string;
  project: string;
}

export async function CommitActivityChartAsync({
  owner,
  project,
}: CommitActivityChartAsyncProps) {
  // Use direct DB query (bypasses cache that might have stale null)
  const assessment = await getAssessmentFromDb(owner, project);

  // Use cached data if available
  if (assessment?.commitActivity?.length) {
    return (
      <CommitActivityChart
        commitActivity={assessment.commitActivity}
        commitsLastYear={assessment.commitsLastYear ?? 0}
      />
    );
  }

  // Fetch from GitHub (deduplicated at fetch level)
  const commitActivity = await fetchCommitActivity(owner, project);
  const commitsLastYear = commitActivity.reduce(
    (sum, week) => sum + week.commits,
    0,
  );

  // Update DB for future visits
  if (assessment) {
    await updateAssessmentChartData(owner, project, {
      commitActivity,
      commitsLastYear,
    });
  }

  return (
    <CommitActivityChart
      commitActivity={commitActivity}
      commitsLastYear={commitsLastYear}
    />
  );
}
