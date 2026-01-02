import type { MetadataRoute } from "next";
import { db } from "@/db/drizzle";
import { assessments } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://deppulse.rigos.dev";

  const staticUrls = [
    {
      url: baseUrl,
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
    url: `${baseUrl}/repo/${repo.fullName}`,
    lastModified: repo.analyzedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...repoUrls];
}
