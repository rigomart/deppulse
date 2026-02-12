import type { Metadata, ResolvingMetadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { ANALYSIS_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getProjectTag } from "@/lib/cache/tags";
import { computeScoreFromMetrics } from "@/lib/maintenance";
import { findLatestAssessmentRunBySlug } from "@/lib/services/assessment";

type Props = {
  params: Promise<{ owner: string; project: string }>;
  children: React.ReactNode;
};

async function getCachedRunForMetadata(owner: string, project: string) {
  "use cache";
  cacheLife(ANALYSIS_CACHE_LIFE);
  cacheTag(getProjectTag(owner, project));

  return findLatestAssessmentRunBySlug(owner, project);
}

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;
  const run = await getCachedRunForMetadata(owner, project);

  if (!run || !run.metrics) {
    return {
      title: `${owner}/${project} - Analyzing...`,
    };
  }

  const { score, category } = computeScoreFromMetrics(run.metrics);
  const title = `${run.repository.fullName} - ${category}`;
  const analyzedAt = run.completedAt ?? run.startedAt;
  const description = run.metrics.description
    ? `${run.metrics.description} Maintenance score: ${score}/100. Last analyzed: ${analyzedAt.toLocaleDateString()}.`
    : `Maintenance assessment for ${run.repository.fullName}. Score: ${score}/100. Category: ${category}.`;

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
