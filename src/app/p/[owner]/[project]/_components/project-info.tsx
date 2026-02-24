import { Calendar } from "lucide-react";
import { Suspense } from "react";
import { RelativeTime } from "@/components/relative-time";
import { RepositoryStats } from "@/components/repository-stats";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { ProjectActions } from "./project-actions";

interface ProjectInfoProps {
  run: AnalysisRun;
}

export function ProjectInfo({ run }: ProjectInfoProps) {
  const metrics = run.metrics;

  return (
    <RepositoryStats run={run} trailing={<ProjectActions run={run} />}>
      {metrics?.repositoryCreatedAt && (
        <div className="flex items-center gap-1.5" title="Created">
          <Calendar className="size-4 opacity-70" />
          <Suspense
            fallback={<span className="font-medium text-foreground/80">—</span>}
          >
            <RelativeTime
              date={metrics.repositoryCreatedAt}
              className="font-medium text-foreground/80"
            />
          </Suspense>
        </div>
      )}
    </RepositoryStats>
  );
}
