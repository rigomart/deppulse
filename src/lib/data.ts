import "server-only";

import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/drizzle";
import { type Assessment, assessments } from "@/db/schema";

// Cache duration: 24 hours (in seconds for unstable_cache)
const CACHE_REVALIDATE = 86400;

export const getAssessment = unstable_cache(
  async (owner: string, repo: string): Promise<Assessment | null> => {
    const fullName = `${owner}/${repo}`;
    const assessment = await db.query.assessments.findFirst({
      where: eq(assessments.fullName, fullName),
    });
    return assessment ?? null;
  },
  ["assessment"],
  {
    revalidate: CACHE_REVALIDATE,
    tags: ["assessments"],
  },
);

// Helper to create a tag for a specific repo
export function getRepoTag(owner: string, repo: string): string {
  return `repo:${owner}/${repo}`;
}

// Cached version with repo-specific tag for granular invalidation
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

export const getRecentAssessments = unstable_cache(
  async (limit: number = 10): Promise<Assessment[]> => {
    return db.query.assessments.findMany({
      orderBy: [desc(assessments.analyzedAt)],
      limit,
    });
  },
  ["recent-assessments"],
  {
    revalidate: CACHE_REVALIDATE,
    tags: ["assessments"],
  },
);
