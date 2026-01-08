import "server-only";

import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { fetchFreshAssessment } from "@/lib/assessment";
import { db } from "./drizzle";
import { type Assessment, assessments } from "./schema";

// Cache duration: 24 hours (in seconds for unstable_cache)
export const CACHE_REVALIDATE = 86400;

/**
 * Builds a cache tag that uniquely identifies a project.
 */
export function getProjectTag(owner: string, project: string): string {
  return `project:${owner}/${project}`;
}

/**
 * Fetches the Assessment record for a given project.
 * Uses React's cache() for request-level deduplication and unstable_cache for persistent caching.
 */
export const getCachedAssessment = cache(
  (owner: string, project: string): Promise<Assessment | null> => {
    return unstable_cache(
      async (): Promise<Assessment | null> => {
        const fullName = `${owner}/${project}`;
        const assessment = await db.query.assessments.findFirst({
          where: eq(assessments.fullName, fullName),
        });
        return assessment ?? null;
      },
      [`assessment-${owner}-${project}`],
      {
        revalidate: CACHE_REVALIDATE,
        tags: [getProjectTag(owner, project)],
      },
    )();
  },
);

/**
 * Fetches the most recent assessment records ordered by analysis time.
 * Uses React cache() for request-level deduplication only.
 * No persistent caching - always shows fresh data from database.
 */
export const getRecentAssessments = cache(
  async (limit: number = 10): Promise<Assessment[]> => {
    return db.query.assessments.findMany({
      orderBy: [desc(assessments.analyzedAt)],
      limit,
    });
  },
);

/**
 * Direct DB query for assessment, bypassing unstable_cache.
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
 * Note: We don't invalidate cache here because this runs during render.
 * The cache will refresh naturally, or on next full analysis.
 */
export async function completeAssessmentScore(
  owner: string,
  project: string,
  data: {
    commitActivity: Array<{ week: string; commits: number }>;
    commitsLastYear: number;
    maintenanceScore: number;
  },
): Promise<void> {
  const fullName = `${owner}/${project}`;

  await db
    .update(assessments)
    .set({
      commitActivity: data.commitActivity,
      commitsLastYear: data.commitsLastYear,
      maintenanceScore: data.maintenanceScore,
    })
    .where(eq(assessments.fullName, fullName));
}
