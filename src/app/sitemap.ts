import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Build sitemap entries for the site root and each repository.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 1,
    },
  ];
}
