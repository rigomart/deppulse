import "server-only";

import { updateTag } from "next/cache";
import { after } from "next/server";
import {
  completeAssessmentScore,
  getAssessmentFromDb,
  getProjectTag,
} from "@/db/queries";
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

  // Calculate score with complete data
  const result = calculateMaintenanceScore({
    lastCommitAt: assessment.lastCommitAt,
    commitActivity,
    openIssuesPercent: assessment.openIssuesPercent,
    medianIssueResolutionDays: assessment.medianIssueResolutionDays,
    issuesCreatedLastYear: assessment.issuesCreatedLastYear ?? 0,
    lastReleaseAt: assessment.lastReleaseAt,
    repositoryCreatedAt: assessment.repositoryCreatedAt,
    openPrsCount: assessment.openPrsCount ?? 0,
    stars: assessment.stars ?? 0,
    forks: assessment.forks ?? 0,
    isArchived: assessment.isArchived ?? false,
  });

  // Persist complete data
  await completeAssessmentScore(owner, project, {
    commitActivity,
    maintenanceScore: result.score,
  });

  // Invalidate caches after the response is sent (updateTag can't run during render)
  after(() => {
    updateTag(getProjectTag(owner, project));
    updateTag("recent-assessments");
  });

  return (
    <ScoreDisplay score={result.score} analyzedAt={assessment.analyzedAt} />
  );
}
