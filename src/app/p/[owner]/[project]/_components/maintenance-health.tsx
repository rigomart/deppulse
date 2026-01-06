import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock,
  GitPullRequest,
} from "lucide-react";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/db/schema";

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

export function MaintenanceHealth({ assessment }: { assessment: Assessment }) {
  const metrics = [
    {
      title: "Open Issues",
      value: fmtCount(assessment.openIssuesCount),
      icon: <CircleDot className={iconClass} />,
      description: "Currently open",
    },
    {
      title: "Closed Issues",
      value: fmtCount(assessment.closedIssuesCount),
      icon: <CheckCircle2 className={iconClass} />,
      description: "Total resolved",
    },
    {
      title: "Open Ratio",
      value: fmt(assessment.openIssuesPercent, "%"),
      icon: <AlertCircle className={iconClass} />,
      description: "Open vs total issues",
    },
    {
      title: "Resolution Time",
      value: fmt(assessment.medianIssueResolutionDays, "d"),
      icon: <Clock className={iconClass} />,
      description: "Median days to close",
    },
    {
      title: "Open PRs",
      value: fmtCount(assessment.openPrsCount),
      icon: <GitPullRequest className={iconClass} />,
      description: "Pending contributions",
    },
  ];

  return (
    <Container>
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Responsiveness
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {metrics.map((metric) => (
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
