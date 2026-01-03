import {
  AlertCircle,
  Calendar,
  Clock,
  GitCommitHorizontal,
  GitPullRequest,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/db/schema";
import { RepoContainer } from "./repo-container";

const iconClass = "w-4 h-4 text-muted-foreground";

export function MaintenanceHealth({ assessment }: { assessment: Assessment }) {
  const metrics = [
    {
      title: "Last Commit",
      value:
        assessment.daysSinceLastCommit !== null
          ? `${assessment.daysSinceLastCommit}d ago`
          : "N/A",
      icon: <Calendar className={iconClass} />,
      description: "Days since most recent commit",
    },
    {
      title: "Commits (90d)",
      value: assessment.commitsLast90Days ?? "N/A",
      icon: <GitCommitHorizontal className={iconClass} />,
      description: "Recent activity level",
    },
    {
      title: "Last Release",
      value:
        assessment.daysSinceLastRelease !== null
          ? `${assessment.daysSinceLastRelease}d ago`
          : "N/A",
      icon: <Tag className={iconClass} />,
      description: "Release cadence",
    },
    {
      title: "Open Issues",
      value:
        assessment.openIssuesPercent !== null
          ? `${assessment.openIssuesPercent}%`
          : "N/A",
      icon: <AlertCircle className={iconClass} />,
      description: "Ratio of open to total issues",
    },
    {
      title: "Resolution Time",
      value:
        assessment.medianIssueResolutionDays !== null
          ? `${assessment.medianIssueResolutionDays}d`
          : "N/A",
      icon: <Clock className={iconClass} />,
      description: "Median days to close issues",
    },
    {
      title: "Open PRs",
      value: assessment.openPrsCount ?? "N/A",
      icon: <GitPullRequest className={iconClass} />,
      description: "Pending contributions",
    },
  ];

  return (
    <RepoContainer>
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Maintenance Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
    </RepoContainer>
  );
}
