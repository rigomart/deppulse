import { Suspense } from "react";
import { Container } from "@/components/container";
import { MaintenanceHealthContent } from "./maintenance-health-content";
import { MaintenanceHealthSkeleton } from "./maintenance-health-skeleton";

interface MaintenanceHealthProps {
  owner: string;
  project: string;
}

export function MaintenanceHealth({ owner, project }: MaintenanceHealthProps) {
  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-150 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Responsiveness
        </h2>
        <Suspense fallback={<MaintenanceHealthSkeleton />}>
          <MaintenanceHealthContent owner={owner} project={project} />
        </Suspense>
      </section>
    </Container>
  );
}
