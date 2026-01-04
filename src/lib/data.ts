import "server-only";

import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";
import { fetchFreshAssessment } from "@/lib/assessment";

// Cache duration: 24 hours (in seconds for unstable_cache)
const CACHE_REVALIDATE = 86400;

/**
 * Builds a cache tag that uniquely identifies a project.
 *
 * @param owner - The project owner or organization
 * @param project - The project name
 * @returns A tag in the form `project:{owner}/{project}` (e.g., `project:octocat/hello-world`)
 */
export function getProjectTag(owner: string, project: string): string {
  return `project:${owner}/${project}`;
}

/**
 * Fetches the Assessment record for a given project.
 * Uses React's cache() for request-level deduplication and unstable_cache for persistent caching.
 *
 * @param owner - Project owner (user or organization)
 * @param project - Project name
 * @returns The Assessment for `owner/project` if found, `null` otherwise
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
        tags: [getProjectTag(owner, project), "assessments"],
      },
    )();
  },
);

/**
 * Fetches the most recent assessment records ordered by analysis time.
 * Uses request-level deduplication only (no persistent cache) to always show fresh data.
 *
 * @param limit - Maximum number of assessments to return (default: 10)
 * @returns An array of Assessment records ordered by `analyzedAt` descending, containing up to `limit` items
 */
export const getRecentAssessments = cache(
  (limit: number = 10): Promise<Assessment[]> => {
    return db.query.assessments.findMany({
      orderBy: [desc(assessments.analyzedAt)],
      limit,
    });
  },
);

/**
 * Gets a cached assessment if fresh, otherwise fetches from GitHub API.
 * Freshness is determined by CACHE_REVALIDATE (24 hours).
 *
 * @param owner - Project owner (user or organization)
 * @param project - Project name
 * @returns The Assessment for the project (cached or freshly analyzed)
 * @throws If the project doesn't exist or GitHub API fails
 */
export async function getOrAnalyzeProject(
  owner: string,
  project: string,
): Promise<Assessment> {
  const cached = await getCachedAssessment(owner, project);

  if (cached) {
    const ageSeconds =
      (Date.now() - new Date(cached.analyzedAt).getTime()) / 1000;
    if (ageSeconds < CACHE_REVALIDATE) {
      return cached;
    }
  }

  // Stale or missing - fetch fresh from GitHub
  return fetchFreshAssessment(owner, project);
}
