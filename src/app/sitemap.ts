import type { MetadataRoute } from "next";
import { db } from "@/db/drizzle";
import { assessments } from "@/db/schema";
import { SITE_URL } from "@/lib/seo";

/**
 * Build sitemap entries for the site root and each repository.
 *
 * @returns An array of sitemap entries: the site root (priority 1, changeFrequency "yearly") followed by per-repo pages whose URL uses the repository's `fullName` and whose `lastModified` is the repository's `analyzedAt` (changeFrequency "weekly", priority 0.8).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 1,
    },
  ];

  const repos = await db
    .select({
      fullName: assessments.fullName,
      analyzedAt: assessments.analyzedAt,
    })
    .from(assessments);

  const repoUrls = repos.map((repo) => ({
    url: `${SITE_URL}/repo/${repo.fullName}`,
    lastModified: repo.analyzedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...repoUrls];
}