import "server-only";

import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { cache } from "react";
import { fetchFreshAssessment } from "@/lib/assessment";
import { db } from "./drizzle";
import { type Assessment, assessments } from "./schema";

// Cache duration: 7 days (in seconds)
export const CACHE_REVALIDATE = 604800;

/**
 * Builds a cache tag that uniquely identifies a project.
 */
export function getProjectTag(owner: string, project: string): string {
  return `project:${owner}/${project}`;
}

/**
 * Fetches the Assessment record for a given project.
 * Uses "use cache" for persistent caching with request-level deduplication.
 */
export async function getCachedAssessment(
  owner: string,
  project: string,
): Promise<Assessment | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(getProjectTag(owner, project));

  const fullName = `${owner}/${project}`;
  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.fullName, fullName),
  });
  return assessment ?? null;
}

/**
 * Fetches the most recent assessment records ordered by analysis time.
 * Uses "use cache" with 5-minute TTL for fresh-ish data on homepage.
 */
export const getRecentAssessments = cache(
  async (limit: number = 10): Promise<Assessment[]> => {
    "use cache";
    cacheLife("minutes");
    cacheTag("recent-assessments");

    return db.query.assessments.findMany({
      where: eq(assessments.status, "complete"),
      orderBy: [desc(assessments.analyzedAt)],
      limit,
    });
  },
);

/**
 * Direct DB query for assessment, bypassing cache.
 * Used for freshness checks where we need actual DB state, not cached data.
 */
export async function getAssessmentFromDb(
  owner: string,
  project: string,
): Promise<Assessment | null> {
  const fullName = `${owner}/${project}`;
  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.fullName, fullName),
  });
  return assessment ?? null;
}

/**
 * Gets a cached assessment if fresh, otherwise fetches from GitHub API.
 * Used for direct link access to project pages.
 */
export const getOrAnalyzeProject = cache(
  async (owner: string, project: string): Promise<Assessment> => {
    const cached = await getAssessmentFromDb(owner, project);

    if (cached) {
      const ageSeconds =
        (Date.now() - new Date(cached.analyzedAt).getTime()) / 1000;
      if (ageSeconds < CACHE_REVALIDATE) {
        return cached;
      }
    }

    return fetchFreshAssessment(owner, project);
  },
);

/**
 * Completes an assessment by adding the maintenance score and commit activity.
 * Called by ScoreAndChartAsync after fetching commit data from GitHub REST API.
 *
 * Invalidates caches so the correct score is reflected on the homepage
 * and project page on subsequent visits.
 */
export async function completeAssessmentScore(
  owner: string,
  project: string,
  data: {
    commitActivity: Array<{ week: string; commits: number }>;
    maintenanceScore: number;
  },
): Promise<void> {
  const fullName = `${owner}/${project}`;

  await db
    .update(assessments)
    .set({
      commitActivity: data.commitActivity,
      maintenanceScore: data.maintenanceScore,
      status: "complete",
    })
    .where(eq(assessments.fullName, fullName));

  updateTag(getProjectTag(owner, project));
  updateTag("recent-assessments");
}
