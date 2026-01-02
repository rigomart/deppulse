import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  GitCommitHorizontal,
  GitPullRequest,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshButton } from "@/components/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCachedAssessment } from "@/lib/data";

type Props = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepoPage({ params }: Props) {
  const { owner, repo } = await params;

  const assessment = await getCachedAssessment(owner, repo);

  if (!assessment) {
    notFound();
  }

  const riskVariant =
    assessment.riskCategory === "HIGH"
      ? "destructive"
      : assessment.riskCategory === "MODERATE"
        ? "secondary"
        : assessment.riskCategory === "LOW"
          ? "default"
          : "outline";

  return (
    <main className="container max-w-5xl mx-auto py-10 px-4 space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {assessment.fullName}
            </h1>
            {assessment.description && (
              <p className="text-lg text-muted-foreground max-w-2xl">
                {assessment.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 bg-card border p-3 rounded-lg shadow-sm">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                Risk Level
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Score: {assessment.riskScore}/100
                </span>
              </div>
            </div>
            <Badge variant={riskVariant} className="text-base px-4 py-1">
              {assessment.riskCategory}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Last Commit"
          value={
            assessment.daysSinceLastCommit !== null
              ? `${assessment.daysSinceLastCommit} days ago`
              : "N/A"
          }
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
          description="Freshness of code"
        />
        <MetricCard
          title="Commits (90d)"
          value={assessment.commitsLast90Days ?? "N/A"}
          icon={
            <GitCommitHorizontal className="w-4 h-4 text-muted-foreground" />
          }
          description="Activity level"
        />
        <MetricCard
          title="Last Release"
          value={
            assessment.daysSinceLastRelease !== null
              ? `${assessment.daysSinceLastRelease} days ago`
              : "N/A"
          }
          icon={<Tag className="w-4 h-4 text-muted-foreground" />}
          description="Release cadence"
        />
        <MetricCard
          title="Open Issues"
          value={
            assessment.openIssuesPercent !== null
              ? `${assessment.openIssuesPercent}%`
              : "N/A"
          }
          icon={<AlertCircle className="w-4 h-4 text-muted-foreground" />}
          description="Ratio of open issues"
        />
        <MetricCard
          title="Resolution Time"
          value={
            assessment.medianIssueResolutionDays !== null
              ? `${assessment.medianIssueResolutionDays} days`
              : "N/A"
          }
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
          description="Median time to close issues"
        />
        <MetricCard
          title="Open PRs"
          value={assessment.openPrsCount ?? "N/A"}
          icon={<GitPullRequest className="w-4 h-4 text-muted-foreground" />}
          description="Pending contributions"
        />
      </div>

      {/* Footer / Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-muted/40 rounded-xl border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            Last analyzed: {new Date(assessment.analyzedAt).toLocaleString()}
          </span>
        </div>
        <RefreshButton owner={owner} repo={repo} />
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
