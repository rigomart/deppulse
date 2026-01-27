import "server-only";

import { format, formatDistanceToNow } from "date-fns";
import { CheckCircle2, GitCommit, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestRunOrAnalyze } from "@/lib/services/assessment-service";

interface RecentActivityContentProps {
  owner: string;
  project: string;
}

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

export async function RecentActivityContent({
  owner,
  project,
}: RecentActivityContentProps) {
  const run = await getLatestRunOrAnalyze(owner, project);
  const metrics = run.metrics;

  const activityMetrics = [
    {
      title: "Last Commit",
      ...formatActivityDate(metrics?.lastCommitAt ?? null),
      icon: <GitCommit className={iconClass} />,
    },
    {
      title: "Last Release",
      ...formatActivityDate(metrics?.lastReleaseAt ?? null),
      icon: <Tag className={iconClass} />,
    },
    {
      title: "Last Closed",
      ...formatActivityDate(metrics?.lastClosedIssueAt ?? null),
      icon: <CheckCircle2 className={iconClass} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {activityMetrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            {metric.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.display}</div>
            <p className="text-xs text-muted-foreground">{metric.relative}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
