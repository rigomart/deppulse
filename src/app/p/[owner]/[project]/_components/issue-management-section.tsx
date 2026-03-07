import { rateIssueManagement } from "@/core/dimensions";
import { type AnalysisRun, getAnalysisTime } from "@/lib/domain/assessment";
import { formatNumber } from "@/lib/utils";
import { DimensionSection } from "./dimension-section";
import { StatGrid } from "./stat-grid";

const fmt = (val: number | null, suffix: string): string =>
  val !== null ? `${val}${suffix}` : "N/A";

const fmtCount = (val: number | null): string =>
  val !== null ? formatNumber(val) : "N/A";

interface IssueManagementSectionProps {
  run: AnalysisRun;
}

export function IssueManagementSection({ run }: IssueManagementSectionProps) {
  const metrics = run.metrics;
  const analysisTime = getAnalysisTime(run);
  const dimension = metrics ? rateIssueManagement(metrics, analysisTime) : null;

  const level = dimension?.level ?? "inactive";

  const stats = [
    {
      label: "Open Issues",
      value: fmtCount(metrics?.openIssuesCount ?? null),
    },
    {
      label: "Closed Issues",
      value: fmtCount(metrics?.closedIssuesCount ?? null),
    },
    {
      label: "Open Ratio",
      value: fmt(metrics?.openIssuesPercent ?? null, "%"),
    },
    {
      label: "Resolution Time",
      value: fmt(metrics?.medianIssueResolutionDays ?? null, "d"),
      description: "median",
    },
    {
      label: "Open PRs",
      value: fmtCount(metrics?.openPrsCount ?? null),
    },
  ];

  return (
    <DimensionSection title="Issue Management" level={level} delay="delay-150">
      <StatGrid
        stats={stats}
        columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      />
    </DimensionSection>
  );
}
