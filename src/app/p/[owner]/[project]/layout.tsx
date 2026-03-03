import { fetchQuery } from "convex/nextjs";
import { formatDistanceToNow } from "date-fns";
import type { Metadata, ResolvingMetadata } from "next";
import { cacheLife } from "next/cache";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { api } from "../../../../../convex/_generated/api";

type Props = {
  params: Promise<{ owner: string; project: string }>;
  children: React.ReactNode;
};

async function cachedMetadata(owner: string, project: string) {
  "use cache";
  cacheLife("days");
  return fetchQuery(api.analysisRuns.getByRepositorySlug, { owner, project });
}

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;

  const run = (await cachedMetadata(owner, project)) as AnalysisRun | null;

  const metrics = run?.metrics;
  if (!run || !metrics) {
    return {
      title: `${owner}/${project} - Analyzing...`,
      description: `Maintenance assessment for ${owner}/${project}. Analysis in progress.`,
    };
  }

  const fullName = run.repository.fullName;

  const lastCommitText = metrics.lastCommitAt
    ? `Last commit ${formatDistanceToNow(new Date(metrics.lastCommitAt), { addSuffix: true })}.`
    : "";

  const releasesLastYear = metrics.releases.filter(
    (r) =>
      new Date(r.publishedAt).getTime() >
      Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).length;
  const releaseText =
    releasesLastYear > 0
      ? `${releasesLastYear} release${releasesLastYear === 1 ? "" : "s"} in the last year.`
      : "";

  const activityParts = [lastCommitText, releaseText].filter(Boolean).join(" ");

  const description = metrics.description
    ? [metrics.description, activityParts].filter(Boolean).join(" ")
    : `${fullName}: ${activityParts || "Maintenance assessment in progress."}`;

  const title = fullName;

  return {
    title,
    description,
    alternates: {
      canonical: `/p/${owner}/${project}`,
    },
    openGraph: {
      title: `Deppulse: ${title}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ProjectLayout({ children }: Props) {
  return <main className="space-y-6">{children}</main>;
}
