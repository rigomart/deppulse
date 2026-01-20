import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, GitCommit, Tag } from "lucide-react";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/db/schema";

const iconClass = "w-4 h-4 text-muted-foreground";

/** Formats a date as relative time, or returns "N/A" if null. */
const fmtDate = (date: Date | string | null): string =>
  date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : "N/A";

export function RecentActivity({ assessment }: { assessment: Assessment }) {
  const metrics = [
    {
      title: "Last Commit",
      value: fmtDate(assessment.lastCommitAt),
      icon: <GitCommit className={iconClass} />,
      description: "Most recent commit",
    },
    {
      title: "Last Release",
      value: fmtDate(assessment.lastReleaseAt),
      icon: <Tag className={iconClass} />,
      description: "Most recent release",
    },
    {
      title: "Last Closed",
      value: fmtDate(assessment.lastClosedIssueAt),
      icon: <CheckCircle2 className={iconClass} />,
      description: "Most recent issue closed",
    },
  ];

  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-100 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent Activity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
