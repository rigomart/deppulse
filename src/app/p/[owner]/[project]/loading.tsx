import { Container } from "@/components/container";
import { CommitChartSkeleton } from "./_components/commit-chart-skeleton";
import { MaintenanceHealthSkeleton } from "./_components/maintenance-health-skeleton";
import { ProjectInfoSkeleton } from "./_components/project-info-skeleton";
import { RecentActivitySkeleton } from "./_components/recent-activity-skeleton";
import { ScoreSkeleton } from "./_components/score-skeleton";

export default function Loading() {
  return (
    <>
      <section className="bg-surface-2">
        <Container className="py-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <ProjectInfoSkeleton />
            <div className="flex items-start">
              <ScoreSkeleton />
            </div>
          </div>
        </Container>
      </section>
      <Container>
        <section className="space-y-4">
          <div className="h-4 w-28 bg-muted animate-pulse rounded" />
          <RecentActivitySkeleton />
        </section>
      </Container>
      <Container>
        <section className="space-y-4">
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          <CommitChartSkeleton />
        </section>
      </Container>
      <Container>
        <section className="space-y-4">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <MaintenanceHealthSkeleton />
        </section>
      </Container>
    </>
  );
}
