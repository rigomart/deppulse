import "server-only";

import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";

// Cache duration: 24 hours (in seconds for unstable_cache)
const CACHE_REVALIDATE = 86400;

/**
 * Builds a cache tag that uniquely identifies a repository.
 *
 * @param owner - The repository owner or organization
 * @param repo - The repository name
 * @returns A tag in the form `repo:{owner}/{repo}` (e.g., `repo:octocat/hello-world`)
 */
export function getRepoTag(owner: string, repo: string): string {
  return `repo:${owner}/${repo}`;
}

/**
 * Fetches the Assessment record for a given repository using a cache with repo-specific invalidation.
 *
 * @param owner - Repository owner (user or organization)
 * @param repo - Repository name
 * @returns The Assessment for `owner/repo` if found, `null` otherwise
 */
export function getCachedAssessment(owner: string, repo: string) {
  return unstable_cache(
    async (): Promise<Assessment | null> => {
      const fullName = `${owner}/${repo}`;
      const assessment = await db.query.assessments.findFirst({
        where: eq(assessments.fullName, fullName),
      });
      return assessment ?? null;
    },
    [`assessment-${owner}-${repo}`],
    {
      revalidate: CACHE_REVALIDATE,
      tags: [getRepoTag(owner, repo), "assessments"],
    },
  )();
}

/**
 * Fetches the most recent assessment records ordered by analysis time.
 *
 * @param limit - Maximum number of assessments to return (default: 10)
 * @returns An array of Assessment records ordered by `analyzedAt` descending, containing up to `limit` items
 */
export function getRecentAssessments(
  limit: number = 10,
): Promise<Assessment[]> {
  return unstable_cache(
    async (): Promise<Assessment[]> => {
      return db.query.assessments.findMany({
        orderBy: [desc(assessments.analyzedAt)],
        limit,
      });
    },
    [`recent-assessments-${limit}`],
    {
      revalidate: CACHE_REVALIDATE,
      tags: ["assessments"],
    },
  )();
}
