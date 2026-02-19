import { fetchQuery } from "convex/nextjs";
import type { Metadata, ResolvingMetadata } from "next";
import { computeScoreFromMetrics } from "@/core/maintenance";
import type { AnalysisRun, MetricsSnapshot } from "@/lib/domain/assessment";
import { api } from "../../../../../convex/_generated/api";

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

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;

  const run = (await fetchQuery(api.analysisRuns.getByRepositorySlug, {
    owner,
    project,
  })) as AnalysisRun | null;

  const metrics = run?.metrics;
  if (!run || !hasScoreInputs(metrics)) {
    return {
      title: `${owner}/${project} - Analyzing...`,
    };
  }

  const { score, category } = computeScoreFromMetrics(metrics);
  const fullName = run.repository.fullName;
  const analyzedAt = run.completedAt ?? run.startedAt;
  const analyzedAtText = analyzedAt
    ? ` Last analyzed: ${new Date(analyzedAt).toLocaleDateString("en-US")}.`
    : "";
  const description = metrics.description
    ? `${metrics.description} Maintenance score: ${score}/100.${analyzedAtText}`
    : `Maintenance assessment for ${fullName}. Score: ${score}/100. Category: ${category}.${analyzedAtText}`;

  const title = `${fullName} - ${category}`;

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
