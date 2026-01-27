import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock,
  GitPullRequest,
} from "lucide-react";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisRun } from "@/lib/domain/assessment";

const iconClass = "w-4 h-4 text-muted-foreground";

/** Formats a nullable metric value with a suffix, or returns "N/A" if null. */
const fmt = (val: number | null, suffix: string): string =>
  val !== null ? `${val}${suffix}` : "N/A";

/** Formats a number with K suffix for thousands. */
const fmtCount = (val: number | null): string => {
  if (val === null) return "N/A";
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
};

export function MaintenanceHealth({ run }: { run: AnalysisRun }) {
  const metrics = run.metrics;
  const healthMetrics = [
    {
      title: "Open Issues",
      value: fmtCount(metrics?.openIssuesCount ?? null),
      icon: <CircleDot className={iconClass} />,
      description: "Currently open",
    },
    {
      title: "Closed Issues",
      value: fmtCount(metrics?.closedIssuesCount ?? null),
      icon: <CheckCircle2 className={iconClass} />,
      description: "Total resolved",
    },
    {
      title: "Open Ratio",
      value: fmt(metrics?.openIssuesPercent ?? null, "%"),
      icon: <AlertCircle className={iconClass} />,
      description: "Open vs total issues",
    },
    {
      title: "Resolution Time",
      value: fmt(metrics?.medianIssueResolutionDays ?? null, "d"),
      icon: <Clock className={iconClass} />,
      description: "Median days to close",
    },
    {
      title: "Open PRs",
      value: fmtCount(metrics?.openPrsCount ?? null),
      icon: <GitPullRequest className={iconClass} />,
      description: "Pending contributions",
    },
  ];

  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-150 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Responsiveness
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {healthMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.description && (
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
