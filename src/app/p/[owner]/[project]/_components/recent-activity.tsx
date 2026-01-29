import { Suspense } from "react";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { RecentActivityContent } from "./recent-activity-content";
import { RecentActivitySkeleton } from "./recent-activity-skeleton";

interface RecentActivityProps {
  run: AnalysisRun;
}

export function RecentActivity({ run }: RecentActivityProps) {
  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-100 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent Activity
        </h2>
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivityContent run={run} />
        </Suspense>
      </section>
    </Container>
  );
}
