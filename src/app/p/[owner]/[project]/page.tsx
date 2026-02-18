import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { findProjectViewBySlug } from "@/adapters/persistence/project-view";
import {
  primeRunWithBaseMetrics,
  startOrReuseAnalysisRun,
  triggerAnalysisRunProcessing,
} from "@/core/analysis-v2";
import {
  ensureAssessmentRunStarted,
  findLatestAssessmentRunBySlug,
} from "@/core/assessment";
import { ANALYSIS_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getProjectTag } from "@/lib/cache/tags";
import { featureFlags } from "@/lib/config/feature-flags";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { AnalysisStatusPoller } from "./_components/analysis-status-poller";
import { CommitActivity } from "./_components/commit-activity";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";
import { ReadmeSection } from "./_components/readme-section";
import { RecentActivity } from "./_components/recent-activity";

/**
 * Required for cache components with dynamic routes.
 * https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes#with-cache-components
 */
export async function generateStaticParams() {
  return [{ owner: "vercel", project: "next.js" }];
}

export default async function ProjectPage({
  params,
}: PageProps<"/p/[owner]/[project]">) {
  "use cache";
  const { owner, project } = await params;
  cacheLife(ANALYSIS_CACHE_LIFE);
  cacheTag(getProjectTag(owner, project));

  let run: AnalysisRun | null = null;

  if (featureFlags.analysisV2WritePath) {
    run = await findLatestAssessmentRunBySlug(owner, project);

    if (!run && featureFlags.analysisV2DirectVisitFallback) {
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
  } else {
    run = await ensureAssessmentRunStarted(owner, project);
  }

  if (run && featureFlags.analysisV2ReadModel) {
    const view = await findProjectViewBySlug(owner, project);
    if (view) {
      run = {
        ...run,
        runState: view.runState,
        progressStep: view.progressStep,
        metrics: view.snapshotJson ?? run.metrics,
        updatedAt: view.updatedAt,
        completedAt: run.completedAt ?? view.analyzedAt ?? null,
      };
    }
  }

  const safeRun: AnalysisRun =
    run ??
    ({
      id: 0,
      repository: {
        id: 0,
        owner,
        name: project,
        fullName: `${owner}/${project}`,
        defaultBranch: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      status: "running",
      runState: "queued",
      progressStep: "bootstrap",
      attemptCount: 0,
      nextRetryAt: null,
      lockToken: null,
      lockedAt: null,
      workflowId: null,
      triggerSource: "system",
      updatedAt: new Date(),
      metrics: null,
      startedAt: new Date(),
      completedAt: null,
      errorCode: null,
      errorMessage: null,
    } satisfies AnalysisRun);

  return (
    <>
      {featureFlags.analysisV2Polling && (
        <AnalysisStatusPoller owner={owner} project={project} run={safeRun} />
      )}
      <ProjectHeader run={safeRun} />
      <RecentActivity run={safeRun} />
      <CommitActivity run={safeRun} />
      <MaintenanceHealth run={safeRun} />
      <ReadmeSection run={safeRun} />
    </>
  );
}
