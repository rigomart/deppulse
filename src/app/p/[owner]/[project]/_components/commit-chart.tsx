import { Suspense } from "react";
import { Container } from "@/components/container";
import { CommitChartContent } from "./commit-chart-content";
import { CommitChartSkeleton } from "./commit-chart-skeleton";

interface CommitChartProps {
  runId: number;
  owner: string;
  project: string;
}

export function CommitChart({ runId, owner, project }: CommitChartProps) {
  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-100 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Activity
        </h2>
        <Suspense fallback={<CommitChartSkeleton />}>
          <CommitChartContent runId={runId} owner={owner} project={project} />
        </Suspense>
      </section>
    </Container>
  );
}
