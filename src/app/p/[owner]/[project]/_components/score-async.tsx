import "server-only";

import { completeAssessmentScore, getAssessmentFromDb } from "@/db/queries";
import { fetchCommitActivity } from "@/lib/github";
import { calculateMaintenanceScore } from "@/lib/maintenance";
import { ScoreDisplay } from "./score-display";

interface ScoreAsyncProps {
  owner: string;
  project: string;
}

export async function ScoreAsync({ owner, project }: ScoreAsyncProps) {
  const assessment = await getAssessmentFromDb(owner, project);

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  // If score already calculated AND we have commit activity data, render from cache
  if (
    assessment.maintenanceScore !== null &&
    assessment.commitActivity?.length
  ) {
    return (
      <ScoreDisplay
        score={assessment.maintenanceScore}
        analyzedAt={assessment.analyzedAt}
      />
    );
  }

  // Fetch commit activity (with retries for 202)
  const commitActivity = await fetchCommitActivity(owner, project);
  const commitsLastYear = commitActivity.reduce(
    (sum, week) => sum + week.commits,
    0,
  );

  // Calculate score with complete data
  const result = calculateMaintenanceScore({
    daysSinceLastCommit: assessment.daysSinceLastCommit,
    commitActivity,
    openIssuesPercent: assessment.openIssuesPercent,
    medianIssueResolutionDays: assessment.medianIssueResolutionDays,
    issuesCreatedLastYear: assessment.issuesCreatedLastYear ?? 0,
    daysSinceLastRelease: assessment.daysSinceLastRelease,
    repositoryCreatedAt: assessment.repositoryCreatedAt,
    openPrsCount: assessment.openPrsCount ?? 0,
    stars: assessment.stars ?? 0,
    forks: assessment.forks ?? 0,
    isArchived: assessment.isArchived ?? false,
  });

  // Persist complete data
  await completeAssessmentScore(owner, project, {
    commitActivity,
    commitsLastYear,
    maintenanceScore: result.score,
  });

  return (
    <ScoreDisplay score={result.score} analyzedAt={assessment.analyzedAt} />
  );
}
