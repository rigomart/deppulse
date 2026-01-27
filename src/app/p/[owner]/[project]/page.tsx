import { CommitChart } from "./_components/commit-chart";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";
import { RecentActivity } from "./_components/recent-activity";

type Props = {
  params: Promise<{ owner: string; project: string }>;
};

export default async function ProjectPage({ params }: Props) {
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
