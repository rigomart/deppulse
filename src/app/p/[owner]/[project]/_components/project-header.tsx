import { Suspense } from "react";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { DimensionSummary } from "./dimension-summary";
import { ProjectInfo } from "./project-info";

function DimensionSummarySkeleton() {
  return (
    <div className="space-y-3 min-w-56">
      {["dev", "issues", "releases"].map((id) => (
        <div key={id} className="flex items-center justify-between gap-4">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
      ))}
      <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
    </div>
  );
}

interface ProjectHeaderProps {
  run: AnalysisRun;
  now: Date;
}

export function ProjectHeader({ run, now }: ProjectHeaderProps) {
  return (
    <section className="bg-surface-1">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="flex-1 min-w-0 py-6">
            <ProjectInfo run={run} />
          </div>

          <div className="sm:min-w-64 h-full flex items-center py-6 px-6 bg-linear-0 from-surface-1 to-surface-3">
            <Suspense fallback={<DimensionSummarySkeleton />}>
              <DimensionSummary run={run} now={now} />
            </Suspense>
          </div>
        </div>
      </Container>
    </section>
  );
}
