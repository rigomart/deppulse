import { format, formatDistanceToNow } from "date-fns";
import { CheckCircle2, GitCommit, Tag } from "lucide-react";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/db/schema";

const iconClass = "w-4 h-4 text-muted-foreground";

function formatActivityDate(date: Date | string | null): {
  display: string;
  relative: string;
} {
  if (!date) return { display: "N/A", relative: "No activity recorded" };
  const d = new Date(date);
  return {
    display: format(d, "MMM d, yyyy"),
    relative: formatDistanceToNow(d, { addSuffix: true }),
  };
}

export function RecentActivity({ assessment }: { assessment: Assessment }) {
  const metrics = [
    {
      title: "Last Commit",
      ...formatActivityDate(assessment.lastCommitAt),
      icon: <GitCommit className={iconClass} />,
    },
    {
      title: "Last Release",
      ...formatActivityDate(assessment.lastReleaseAt),
      icon: <Tag className={iconClass} />,
    },
    {
      title: "Last Closed",
      ...formatActivityDate(assessment.lastClosedIssueAt),
      icon: <CheckCircle2 className={iconClass} />,
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
                <div className="text-2xl font-bold">{metric.display}</div>
                <p className="text-xs text-muted-foreground">
                  {metric.relative}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
