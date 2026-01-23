import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/container";
import { getCachedAssessment, getOrAnalyzeProject } from "@/db/queries";
import type { Assessment } from "@/db/schema";
import { getCategoryFromScore } from "@/lib/maintenance";
import { ChartAsync } from "./_components/chart-async";
import {
  CommitChartSkeleton,
  ProjectPageSkeleton,
  ScoreSkeleton,
} from "./_components/chart-skeletons";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";
import { RecentActivity } from "./_components/recent-activity";
import { ScoreAsync } from "./_components/score-async";

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

export default function ProjectPage({ params }: Props) {
  return (
    <main className="space-y-6">
      <Suspense fallback={<ProjectPageSkeleton />}>
        <ProjectContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProjectContent({ params }: Props) {
  const { owner, project } = await params;

  // Try cached data first (resolves instantly on cache hit - no skeleton flash).
  // Only falls through to getOrAnalyzeProject for uncached projects.
  const cached = await getCachedAssessment(owner, project);
  const assessment = cached ?? (await getOrAnalyzeProject(owner, project));

  return <ProjectDisplay owner={owner} project={project} assessment={assessment} />;
}

function ProjectDisplay({
  owner,
  project,
  assessment,
}: {
  owner: string;
  project: string;
  assessment: Assessment;
}) {
  return (
    <>
      {/* Header with deferred score (score waits for commit activity) */}
      <ProjectHeader
        assessment={assessment}
        scoreSlot={
          <Suspense fallback={<ScoreSkeleton />}>
            <ScoreAsync owner={owner} project={project} />
          </Suspense>
        }
      />

      {/* Recent activity timestamps */}
      <RecentActivity assessment={assessment} />

      {/* Deferred chart (waits for commit activity fetch) */}
      <Container>
        <section className="space-y-4 animate-in fade-in duration-300 delay-100 fill-mode-backwards">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Activity
          </h2>
          <Suspense fallback={<CommitChartSkeleton />}>
            <ChartAsync owner={owner} project={project} />
          </Suspense>
        </section>
      </Container>

      {/* Renders immediately - issue metrics from GraphQL */}
      <MaintenanceHealth assessment={assessment} />
    </>
  );
}
