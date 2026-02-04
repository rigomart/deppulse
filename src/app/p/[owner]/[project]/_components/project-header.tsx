import { Suspense } from "react";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { ProjectInfo } from "./project-info";
import { Score } from "./score";
import { ScoreSkeleton } from "./score-skeleton";

interface ProjectHeaderProps {
  run: AnalysisRun;
  owner: string;
  project: string;
}

export function ProjectHeader({ run, owner, project }: ProjectHeaderProps) {
  return (
    <section className="bg-surface-2">
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between animate-in fade-in slide-in-from-bottom-1 duration-300">
          <ProjectInfo run={run} />

          <div className="flex items-start">
            <Suspense fallback={<ScoreSkeleton />}>
              <Score runId={run.id} owner={owner} project={project} />
            </Suspense>
          </div>
        </div>
      </Container>
    </section>
  );
}
