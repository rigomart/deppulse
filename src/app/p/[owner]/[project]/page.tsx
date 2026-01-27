import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { getCategoryFromScore } from "@/lib/maintenance";
import {
  getCachedLatestRun,
  getLatestRunOrAnalyze,
} from "@/lib/services/assessment-service";
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
  const run = await getCachedLatestRun(owner, project);

  if (!run || run.score === null) {
    // Direct link to new project - page will handle fetching
    return {
      title: `${owner}/${project} - Analyzing...`,
    };
  }

  const category = run.category ?? getCategoryFromScore(run.score);
  const title = `${run.repository.fullName} - ${category}`;
  const analyzedAt = run.completedAt ?? run.startedAt;
  const description = run.metrics?.description
    ? `${run.metrics.description} Maintenance score: ${run.score}/100. Last analyzed: ${analyzedAt.toLocaleDateString()}.`
    : `Maintenance assessment for ${run.repository.fullName}. Score: ${run.score}/100. Category: ${category}.`;

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
  // Only falls through to getLatestRunOrAnalyze for uncached projects.
  const cached = await getCachedLatestRun(owner, project);
  const run = cached ?? (await getLatestRunOrAnalyze(owner, project));

  return <ProjectDisplay owner={owner} project={project} run={run} />;
}

function ProjectDisplay({
  owner,
  project,
  run,
}: {
  owner: string;
  project: string;
  run: AnalysisRun;
}) {
  return (
    <>
      {/* Header with deferred score (score waits for commit activity) */}
      <ProjectHeader
        run={run}
        scoreSlot={
          <Suspense fallback={<ScoreSkeleton />}>
            <ScoreAsync owner={owner} project={project} />
          </Suspense>
        }
      />

      {/* Recent activity timestamps */}
      <RecentActivity run={run} />

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
      <MaintenanceHealth run={run} />
    </>
  );
}
