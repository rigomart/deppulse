import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { CommitActivityContent } from "./commit-activity-content";

interface CommitActivityProps {
  run: AnalysisRun;
}

export function CommitActivity({ run }: CommitActivityProps) {
  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-125 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Commit Activity
        </h2>
        <CommitActivityContent run={run} />
      </section>
    </Container>
  );
}
