"use client";

import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { api } from "../../../../../../convex/_generated/api";

const CommitActivityContent = dynamic(
  () =>
    import("./commit-activity-content").then((mod) => ({
      default: mod.CommitActivityContent,
    })),
  {
    loading: () => (
      <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50">
        <p className="text-sm text-muted-foreground">
          Loading commit history...
        </p>
      </div>
    ),
  },
);

interface CommitActivityLiveProps {
  owner: string;
  project: string;
  initialRun: AnalysisRun;
}

export function CommitActivityLive({
  owner,
  project,
  initialRun,
}: CommitActivityLiveProps) {
  const liveRun = useQuery(api.analysisRuns.getByRepositorySlug, {
    owner,
    project,
  });

  // Use live data when available, fall back to server-rendered initial data
  const run = (liveRun as AnalysisRun | null) ?? initialRun;

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
