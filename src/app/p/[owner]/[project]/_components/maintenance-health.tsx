import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { MaintenanceHealthContent } from "./maintenance-health-content";

interface MaintenanceHealthProps {
  run: AnalysisRun;
}

export function MaintenanceHealth({ run }: MaintenanceHealthProps) {
  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-150 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Responsiveness
        </h2>
        <MaintenanceHealthContent run={run} />
      </section>
    </Container>
  );
}
