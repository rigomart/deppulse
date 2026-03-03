import { Suspense } from "react";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { ActivitySummary } from "./activity-summary";
import { ProjectInfo } from "./project-info";

const skeletonStat = (
  <div className="px-5 py-4">
    <div className="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
    <div className="h-5 w-28 rounded bg-muted animate-pulse mb-1.5" />
    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
  </div>
);

function ActivitySummarySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface-3 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
      {skeletonStat}
      {skeletonStat}
      {skeletonStat}
      {skeletonStat}
    </div>
  );
}

interface ProjectHeaderProps {
  run: AnalysisRun;
}

export function ProjectHeader({ run }: ProjectHeaderProps) {
  return (
    <section className="bg-surface-2">
      <Container className="py-6 space-y-5 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <ProjectInfo run={run} />

        <Suspense fallback={<ActivitySummarySkeleton />}>
          <ActivitySummary run={run} />
        </Suspense>
      </Container>
    </section>
  );
}
