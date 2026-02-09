import { cacheLife, cacheTag } from "next/cache";
import { ANALYSIS_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getProjectTag } from "@/lib/cache/tags";
import { ensureAssessmentRunStarted } from "@/lib/services/assessment";
import { CommitChart } from "./_components/commit-chart";
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

  const run = await ensureAssessmentRunStarted(owner, project);

  return (
    <>
      <ProjectHeader run={run} owner={owner} project={project} />
      <RecentActivity run={run} />
      <CommitChart runId={run.id} owner={owner} project={project} />
      <MaintenanceHealth run={run} />
      <ReadmeSection run={run} />
    </>
  );
}
