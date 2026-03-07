"use client";

import { formatDistanceToNow } from "date-fns";
import { rateDevelopmentActivity } from "@/core/dimensions";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { CommitActivityLive } from "./commit-activity-live";
import { DimensionSection } from "./dimension-section";

interface DevelopmentActivitySectionProps {
  run: AnalysisRun;
  owner: string;
  project: string;
}

export function DevelopmentActivitySection({
  run,
  owner,
  project,
}: DevelopmentActivitySectionProps) {
  const metrics = run.metrics;
  const analysisTime = new Date(run.completedAt ?? run.startedAt);
  const dimension = metrics
    ? rateDevelopmentActivity(metrics, analysisTime)
    : null;

  const level = dimension?.level ?? "inactive";

  const lastCommitDate = metrics?.lastCommitAt
    ? new Date(metrics.lastCommitAt)
    : null;

  const stats = [
    {
      label: "Commits (30d)",
      value: String(metrics?.commitsLast30Days ?? "N/A"),
    },
    {
      label: "Commits (90d)",
      value: String(metrics?.commitsLast90Days ?? "N/A"),
    },
    {
      label: "PRs Merged (90d)",
      value: String(metrics?.mergedPrsLast90Days ?? "N/A"),
    },
    {
      label: "Last Commit",
      value: lastCommitDate
        ? formatDistanceToNow(lastCommitDate, { addSuffix: true })
        : "N/A",
    },
  ];

  return (
    <DimensionSection title="Development Activity" level={level} delay="delay-100">
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-lg border border-border overflow-hidden">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="px-4 py-3 border-b border-r border-border last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      <CommitActivityLive owner={owner} project={project} initialRun={run} />
    </DimensionSection>
  );
}
