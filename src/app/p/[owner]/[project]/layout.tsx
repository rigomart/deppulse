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

async function getCachedMetadata(owner: string, project: string) {
  "use cache";
  cacheLife(ANALYSIS_CACHE_LIFE);
  cacheTag(getProjectTag(owner, project));

  const run = await findLatestAssessmentRunBySlug(owner, project);
  if (!run?.metrics) return null;

  const { score, category } = computeScoreFromMetrics(run.metrics);
  return {
    fullName: run.repository.fullName,
    description: run.metrics.description,
    score,
    category,
    analyzedAt: run.completedAt ?? run.startedAt,
  };
}

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;
  const meta = await getCachedMetadata(owner, project);

  if (!meta) {
    return {
      title: `${owner}/${project} - Analyzing...`,
    };
  }

  const title = `${meta.fullName} - ${meta.category}`;
  const description = meta.description
    ? `${meta.description} Maintenance score: ${meta.score}/100. Last analyzed: ${meta.analyzedAt.toLocaleDateString()}.`
    : `Maintenance assessment for ${meta.fullName}. Score: ${meta.score}/100. Category: ${meta.category}.`;

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
