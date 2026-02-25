import dynamic from "next/dynamic";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { RecentActivitySkeleton } from "./recent-activity-skeleton";

const RecentActivityContent = dynamic(
  () =>
    import("./recent-activity-content").then((mod) => ({
      default: mod.RecentActivityContent,
    })),
  {
    loading: () => <RecentActivitySkeleton />,
  },
);

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
        <RecentActivityContent run={run} />
      </section>
    </Container>
  );
}
