import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { computeDimensions, type DimensionLevel } from "@/core/dimensions";
import type { AnalysisRun, MetricsSnapshot } from "@/lib/domain/assessment";
import { getAnalysisTime } from "@/lib/domain/assessment";
import { api } from "../../../../../convex/_generated/api";

type Props = {
  params: Promise<{ owner: string; project: string }>;
  children: React.ReactNode;
};

function hasDimensionInputs(metrics: unknown): metrics is MetricsSnapshot {
  if (!metrics || typeof metrics !== "object") return false;

  return (
    "commitsLast90Days" in metrics &&
    typeof metrics.commitsLast90Days === "number" &&
    "mergedPrsLast90Days" in metrics &&
    typeof metrics.mergedPrsLast90Days === "number"
  );
}

function summarizeDimensions(levels: DimensionLevel[]): string {
  const weakOrInactive = levels.filter((l) => l === "weak" || l === "inactive");
  if (weakOrInactive.length === 0) return "healthy";
  if (weakOrInactive.length === levels.length) return "at risk";
  return "needs attention";
}

async function cachedMetadata(owner: string, project: string) {
  "use cache";
  cacheLife("days");

  const run = (await fetchQuery(api.analysisRuns.getByRepositorySlug, {
    owner,
    project,
  })) as AnalysisRun | null;

  const metrics = run?.metrics;
  if (!run || !hasDimensionInputs(metrics)) {
    return {
      title: `${owner}/${project} - Analyzing...`,
      description: `Maintenance assessment for ${owner}/${project}. Analysis in progress.`,
      canonical: `/p/${owner}/${project}`,
    };
  }

  const analysisTime = getAnalysisTime(run);
  const dimensions = computeDimensions(metrics, analysisTime);
  const levels = [
    dimensions.developmentActivity.level,
    dimensions.issueManagement.level,
    dimensions.releaseCadence.level,
  ];
  const summary = summarizeDimensions(levels);

  const fullName = run.repository.fullName;
  const analyzedAt = run.completedAt ?? run.startedAt;
  const analyzedAtText = analyzedAt
    ? ` Last analyzed: ${new Date(analyzedAt).toLocaleDateString("en-US")}.`
    : "";

  const dimensionText = `Dev: ${dimensions.developmentActivity.level}, Issues: ${dimensions.issueManagement.level}, Releases: ${dimensions.releaseCadence.level}.`;
  const description = metrics.description
    ? `${metrics.description} ${dimensionText}${analyzedAtText}`
    : `Health assessment for ${fullName}. ${dimensionText}${analyzedAtText}`;

  return {
    title: `${fullName} - ${summary}`,
    description,
    canonical: `/p/${owner}/${project}`,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, project } = await params;
  const { title, description, canonical } = await cachedMetadata(
    owner,
    project,
  );

  return {
    title,
    description,
    alternates: {
      canonical,
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
