import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Provide robots metadata that permits all crawlers and points to the site's sitemap.
 *
 * @returns A `MetadataRoute.Robots` object that allows all user agents to access all paths and sets the `sitemap` to the site's sitemap URL (derived from `SITE_URL`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}