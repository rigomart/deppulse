import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/container";
import { getCachedAssessment, getOrAnalyzeProject } from "@/db/queries";
import { getCategoryFromScore } from "@/lib/maintenance";
import { ChartAsync } from "./_components/chart-async";
import {
  CommitChartSkeleton,
  ScoreSkeleton,
} from "./_components/chart-skeletons";
import { CommitActivityChart } from "./_components/commit-activity-chart";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";
import { RecentActivity } from "./_components/recent-activity";
import { ScoreAsync } from "./_components/score-async";
import { ScoreDisplay } from "./_components/score-display";

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

  const cached = await getCachedAssessment(owner, project);
  const assessment = cached ?? (await getOrAnalyzeProject(owner, project));

  const isComplete =
    assessment.maintenanceScore !== null &&
    Boolean(assessment.commitActivity?.length);

  return (
    <main className="space-y-6">
      <ProjectHeader
        assessment={assessment}
        scoreSlot={
          isComplete ? (
            <ScoreDisplay
              score={assessment.maintenanceScore ?? 0}
              analyzedAt={assessment.analyzedAt}
            />
          ) : (
            <Suspense fallback={<ScoreSkeleton />}>
              <ScoreAsync owner={owner} project={project} />
            </Suspense>
          )
        }
      />

      <RecentActivity assessment={assessment} />

      <Container>
        <section className="space-y-4 animate-in fade-in duration-300 delay-100 fill-mode-backwards">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Activity
          </h2>
          {isComplete ? (
            <CommitActivityChart
              commitActivity={assessment.commitActivity}
              commitsLastYear={
                assessment.commitActivity?.reduce(
                  (sum, week) => sum + week.commits,
                  0,
                ) ?? 0
              }
            />
          ) : (
            <Suspense fallback={<CommitChartSkeleton />}>
              <ChartAsync owner={owner} project={project} />
            </Suspense>
          )}
        </section>
      </Container>

      <MaintenanceHealth assessment={assessment} />
    </main>
  );
}
