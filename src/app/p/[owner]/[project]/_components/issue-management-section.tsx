import { rateIssueManagement } from "@/core/dimensions";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { DimensionSection } from "./dimension-section";

const fmt = (val: number | null, suffix: string): string =>
  val !== null ? `${val}${suffix}` : "N/A";

const fmtCount = (val: number | null): string => {
  if (val === null) return "N/A";
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
};

interface IssueManagementSectionProps {
  run: AnalysisRun;
}

export function IssueManagementSection({ run }: IssueManagementSectionProps) {
  const metrics = run.metrics;
  const analysisTime = new Date(run.completedAt ?? run.startedAt);
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
    <DimensionSection
      title="Issue Management"
      level={level}
      delay="delay-150"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 rounded-lg border border-border overflow-hidden">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="px-4 py-3 border-b border-r border-border"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">
              {stat.value}
              {stat.description && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  {stat.description}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </DimensionSection>
  );
}
