import { fetchQuery } from "convex/nextjs";
import { cacheLife } from "next/cache";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { api } from "../../../../../convex/_generated/api";
import { CommitActivityLive } from "./_components/commit-activity-live";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { NotAnalyzedError } from "./_components/not-analyzed-error";
import { ProjectHeader } from "./_components/project-header";
import { ReadmeSection } from "./_components/readme-section";
import { RecentActivity } from "./_components/recent-activity";

async function CachedProjectPage({
  owner,
  project,
}: {
  owner: string;
  project: string;
}) {
  "use cache";
  cacheLife("days");

  const run = await fetchQuery(api.analysisRuns.getByRepositorySlug, {
    owner,
    project,
  });

  if (!run) {
    return <NotAnalyzedError owner={owner} project={project} />;
  }

  const safeRun = run as AnalysisRun;

  return (
    <>
      <ProjectHeader run={safeRun} />
      <RecentActivity run={safeRun} />
      <CommitActivityLive
        owner={owner}
        project={project}
        initialRun={safeRun}
      />
      <MaintenanceHealth run={safeRun} />
      <ReadmeSection run={safeRun} />
    </>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ owner: string; project: string }>;
}) {
  const { owner, project } = await params;
  return <CachedProjectPage owner={owner} project={project} />;
}
