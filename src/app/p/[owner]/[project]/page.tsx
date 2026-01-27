import { CommitChart } from "./_components/commit-chart";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";
import { RecentActivity } from "./_components/recent-activity";

/**
 * Needed to avoid Suspense boundaries.
 * https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes#with-cache-components
 */
export async function generateStaticParams() {
  return [{ owner: "vercel", project: "next.js" }];
}

export default async function ProjectPage({
  params,
}: PageProps<"/p/[owner]/[project]">) {
  const { owner, project } = await params;

  return (
    <>
      {/* Each component fetches its own data and handles its own caching/suspense */}
      <ProjectHeader owner={owner} project={project} />
      <RecentActivity owner={owner} project={project} />
      <CommitChart owner={owner} project={project} />
      <MaintenanceHealth owner={owner} project={project} />
    </>
  );
}
