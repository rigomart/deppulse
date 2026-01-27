import { Suspense } from "react";
import { Container } from "@/components/container";
import { ProjectInfo } from "./project-info";
import { ProjectInfoSkeleton } from "./project-info-skeleton";
import { Score } from "./score";
import { ScoreSkeleton } from "./score-skeleton";

interface ProjectHeaderProps {
  owner: string;
  project: string;
}

export function ProjectHeader({ owner, project }: ProjectHeaderProps) {
  return (
    <section className="bg-surface-2">
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between animate-in fade-in slide-in-from-bottom-1 duration-300">
          <Suspense fallback={<ProjectInfoSkeleton />}>
            <ProjectInfo owner={owner} project={project} />
          </Suspense>

          <div className="flex items-start">
            <Suspense fallback={<ScoreSkeleton />}>
              <Score owner={owner} project={project} />
            </Suspense>
          </div>
        </div>
      </Container>
    </section>
  );
}
