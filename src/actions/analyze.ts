"use server";

import { updateTag } from "next/cache";
import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";
import { getRepoTag } from "@/lib/data";
import { fetchRepoMetrics } from "@/lib/github";
import { calculateRisk } from "@/lib/risk";

export async function analyze(
  owner: string,
  repo: string,
): Promise<Assessment> {
  const fullName = `${owner}/${repo}`;

  const metrics = await fetchRepoMetrics(owner, repo);
  const risk = calculateRisk({
    daysSinceLastCommit: metrics.daysSinceLastCommit,
    commitsLast90Days: metrics.commitsLast90Days,
    daysSinceLastRelease: metrics.daysSinceLastRelease,
    openIssuesPercent: metrics.openIssuesPercent,
    medianIssueResolutionDays: metrics.medianIssueResolutionDays,
    openPrsCount: metrics.openPrsCount,
  });

  const [result] = await db
    .insert(assessments)
    .values({
      owner,
      repo,
      fullName,
      description: metrics.description,
      stars: metrics.stars,
      forks: metrics.forks,
      avatarUrl: metrics.avatarUrl,
      htmlUrl: metrics.htmlUrl,
      daysSinceLastCommit: metrics.daysSinceLastCommit,
      commitsLast90Days: metrics.commitsLast90Days,
      daysSinceLastRelease: metrics.daysSinceLastRelease,
      openIssuesPercent: metrics.openIssuesPercent,
      medianIssueResolutionDays: metrics.medianIssueResolutionDays,
      openPrsCount: metrics.openPrsCount,
      riskCategory: risk.category,
      riskScore: risk.score,
      analyzedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: assessments.fullName,
      set: {
        description: metrics.description,
        stars: metrics.stars,
        forks: metrics.forks,
        avatarUrl: metrics.avatarUrl,
        htmlUrl: metrics.htmlUrl,
        daysSinceLastCommit: metrics.daysSinceLastCommit,
        commitsLast90Days: metrics.commitsLast90Days,
        daysSinceLastRelease: metrics.daysSinceLastRelease,
        openIssuesPercent: metrics.openIssuesPercent,
        medianIssueResolutionDays: metrics.medianIssueResolutionDays,
        openPrsCount: metrics.openPrsCount,
        riskCategory: risk.category,
        riskScore: risk.score,
        analyzedAt: new Date(),
      },
    })
    .returning();

  // Invalidate cached data for this specific repo and the recent list
  updateTag(getRepoTag(owner, repo));
  updateTag("assessments");

  return result;
}
