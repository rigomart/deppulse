import { formatDistance } from "date-fns";
import { rateDevelopmentActivity } from "@/core/dimensions";
import { type AnalysisRun, getAnalysisTime } from "@/lib/domain/assessment";
import { CommitActivityLive } from "./commit-activity-live";
import { DimensionSection } from "./dimension-section";
import { StatGrid } from "./stat-grid";

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
  const analysisTime = getAnalysisTime(run);
  const dimension = metrics
    ? rateDevelopmentActivity(metrics, analysisTime)
    : null;

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
        ? formatDistance(lastCommitDate, analysisTime, { addSuffix: true })
        : "N/A",
    },
  ];

  return (
    <DimensionSection
      title="Development Activity"
      level={dimension?.level ?? null}
      delay="delay-100"
    >
      <StatGrid stats={stats} columns="grid-cols-2 sm:grid-cols-4" />
      <CommitActivityLive owner={owner} project={project} initialRun={run} />
    </DimensionSection>
  );
}
