import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/container";
import { getCachedAssessment, getOrAnalyzeProject } from "@/db/queries";
import { getCategoryFromScore } from "@/lib/maintenance";
import { CommitChartSkeleton } from "./_components/chart-skeletons";
import { CommitActivityChartAsync } from "./_components/commit-activity-chart-async";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";

// Cache rendered pages for 24 hours (matches data freshness threshold)
export const revalidate = 86400;

type Props = {
  params: Promise<{ owner: string; project: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;

  // Use cache for metadata - fast path for homepage navigation
  const assessment = await getCachedAssessment(owner, project);

  if (!assessment) {
    // Direct link to new project - page will handle fetching
    return {
      title: `${owner}/${project} - Analyzing...`,
    };
  }

  const category = getCategoryFromScore(assessment.maintenanceScore ?? 0);
  const title = `${assessment.fullName} - ${category}`;
  const description = assessment.description
    ? `${assessment.description} Maintenance score: ${assessment.maintenanceScore}/100. Last analyzed: ${new Date(assessment.analyzedAt).toLocaleDateString()}.`
    : `Maintenance assessment for ${assessment.fullName}. Score: ${assessment.maintenanceScore}/100. Category: ${category}.`;

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

export default async function ProjectPage({ params }: Props) {
  const { owner, project } = await params;

  // Fetches from cache if fresh (<24h), otherwise re-analyzes from GitHub
  const assessment = await getOrAnalyzeProject(owner, project);

  return (
    <main className="space-y-6">
      <ProjectHeader assessment={assessment} />

      <Container>
        <section className="space-y-4 animate-in fade-in duration-300 delay-100 fill-mode-backwards">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Activity
          </h2>
          <Suspense fallback={<CommitChartSkeleton />}>
            <CommitActivityChartAsync owner={owner} project={project} />
          </Suspense>
        </section>
      </Container>

      <MaintenanceHealth assessment={assessment} />
    </main>
  );
}
