import { cacheLife, cacheTag } from "next/cache";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { findProjectViewBySlug } from "@/adapters/persistence/project-view";
import {
  primeRunWithBaseMetrics,
  startOrReuseAnalysisRun,
  triggerAnalysisRunProcessing,
} from "@/core/analysis";
import { findLatestAssessmentRunBySlug } from "@/core/assessment";
import { ANALYSIS_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getProjectTag } from "@/lib/cache/tags";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { AnalysisStatusPoller } from "./_components/analysis-status-poller";
import { CommitActivity } from "./_components/commit-activity";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";
import { ReadmeSection } from "./_components/readme-section";
import { RecentActivity } from "./_components/recent-activity";

function ProjectPageFallback() {
  return (
    <div className="px-4 py-6 text-sm text-muted-foreground">
      Loading project analysis...
    </div>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ owner: string; project: string }>;
}) {
  return (
    <Suspense fallback={<ProjectPageFallback />}>
      <ProjectPageContent params={params} />
    </Suspense>
  );
}

async function ProjectPageContent({
  params,
}: {
  params: Promise<{ owner: string; project: string }>;
}) {
  await connection();

  const { owner, project } = await params;
  let run = await getCachedProjectRun(owner, project);

  if (!run) {
    const started = await startOrReuseAnalysisRun({
      owner,
      project,
      triggerSource: "direct_visit",
    });
    run =
      (started.created
        ? await primeRunWithBaseMetrics(
            started.run.id,
            started.run.lockToken ?? null,
          ).catch(() => started.run)
        : started.run) ?? started.run;
    if (started.created) {
      const runForProcessing = run ?? started.run;
      after(async () => {
        await triggerAnalysisRunProcessing({
          runId: runForProcessing.id,
          lockToken: runForProcessing.lockToken ?? null,
        });
      });
    }
  }

  if (!run) {
    throw new Error("Failed to load analysis run.");
  }

  const safeRun: AnalysisRun = run;

  return (
    <>
      <AnalysisStatusPoller owner={owner} project={project} run={safeRun} />
      <ProjectHeader run={safeRun} />
      <RecentActivity run={safeRun} />
      <CommitActivity run={safeRun} />
      <MaintenanceHealth run={safeRun} />
      <ReadmeSection run={safeRun} />
    </>
  );
}

async function getCachedProjectRun(
  owner: string,
  project: string,
): Promise<AnalysisRun | null> {
  "use cache";
  cacheLife(ANALYSIS_CACHE_LIFE);
  cacheTag(getProjectTag(owner, project));

  const run = await findLatestAssessmentRunBySlug(owner, project);
  if (!run) return null;

  const view = await findProjectViewBySlug(owner, project);
  if (!view) return run;

  return {
    ...run,
    runState: view.runState,
    progressStep: view.progressStep,
    metrics: view.snapshotJson ?? run.metrics,
    updatedAt: view.updatedAt,
    completedAt: run.completedAt ?? view.analyzedAt ?? null,
  };
}
