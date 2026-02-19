import type { Metadata, ResolvingMetadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { findProjectViewBySlug } from "@/adapters/persistence/project-view";
import { findLatestAssessmentRunBySlug } from "@/core/assessment";
import { computeScoreFromMetrics } from "@/core/maintenance";
import { ANALYSIS_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getProjectTag } from "@/lib/cache/tags";
import type { MetricsSnapshot } from "@/lib/domain/assessment";

type Props = {
  params: Promise<{ owner: string; project: string }>;
  children: React.ReactNode;
};

function hasScoreInputs(metrics: unknown): metrics is MetricsSnapshot {
  if (!metrics || typeof metrics !== "object") return false;

  return (
    "commitsLast90Days" in metrics &&
    typeof metrics.commitsLast90Days === "number" &&
    "mergedPrsLast90Days" in metrics &&
    typeof metrics.mergedPrsLast90Days === "number"
  );
}

async function getCachedMetadata(owner: string, project: string) {
  "use cache";
  cacheLife(ANALYSIS_CACHE_LIFE);
  cacheTag(getProjectTag(owner, project));

  const run = await findLatestAssessmentRunBySlug(owner, project);
  const view = await findProjectViewBySlug(owner, project);
  const metrics = view?.snapshotJson ?? run?.metrics;
  if (!hasScoreInputs(metrics)) return null;

  const { score, category } = computeScoreFromMetrics(metrics);
  return {
    fullName: run?.repository.fullName ?? `${owner}/${project}`,
    description: metrics.description,
    score,
    category,
    analyzedAt: view?.analyzedAt ?? run?.completedAt ?? run?.startedAt ?? null,
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
  const analyzedAtText = meta.analyzedAt
    ? ` Last analyzed: ${meta.analyzedAt.toLocaleDateString("en-US")}.`
    : "";
  const description = meta.description
    ? `${meta.description} Maintenance score: ${meta.score}/100.${analyzedAtText}`
    : `Maintenance assessment for ${meta.fullName}. Score: ${meta.score}/100. Category: ${meta.category}.${analyzedAtText}`;

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
