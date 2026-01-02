import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  Tag,
} from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCachedAssessment } from "@/lib/data";
import { formatAge, formatNumber } from "@/lib/utils";

type Props = {
  params: Promise<{ owner: string; repo: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, repo } = await params;
  const assessment = await getCachedAssessment(owner, repo);

  if (!assessment) {
    return {
      title: "Repository Not Found",
    };
  }

  const title = `${assessment.fullName} - ${assessment.riskCategory}`;
  const description = assessment.description
    ? `${assessment.description} Risk score: ${assessment.riskScore}/100. Last analyzed: ${new Date(assessment.analyzedAt).toLocaleDateString()}.`
    : `Maintenance assessment for ${assessment.fullName}. Risk score: ${assessment.riskScore}/100. Category: ${assessment.riskCategory}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/repo/${owner}/${repo}`,
    },
    openGraph: {
      title: `Deppulse: ${title}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RepoPage({ params }: Props) {
  const { owner, repo } = await params;

  const assessment = await getCachedAssessment(owner, repo);

  if (!assessment) {
    notFound();
  }

  return (
    <main className="container max-w-5xl mx-auto py-4 px-3 sm:px-4 sm:py-6 space-y-8">
      {/* Header Section */}
      <section className="space-y-2 bg-surface-2 px-4 py-3">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Back to search
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {assessment.fullName}
            </h1>
            {assessment.description && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                {assessment.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {assessment.htmlUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={assessment.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                  <ExternalLink className="size-3 ml-2" />
                </a>
              </Button>
            )}
            {assessment.repositoryCreatedAt && (
              <div className="text-xs text-muted-foreground">
                Created {formatAge(new Date(assessment.repositoryCreatedAt))}
              </div>
            )}
          </div>
        </div>

        {/* Risk Assessment and Repository Info*/}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="space-y-3">
            <h2 className="sr-only">Repository Info</h2>
            <div className="flex gap-x-2 sm:gap-x-4 text-sm">
              <div>
                <span className="text-muted-foreground">Stars</span>
                <p className="font-medium">
                  {formatNumber(assessment.stars ?? 0)}
                </p>
              </div>
              <Separator orientation="vertical" />
              <div>
                <span className="text-muted-foreground">Forks</span>
                <p className="font-medium">
                  {formatNumber(assessment.forks ?? 0)}
                </p>
              </div>
              <Separator orientation="vertical" />
              <div>
                <span className="text-muted-foreground">Language</span>
                <p className="font-medium">{assessment.language ?? "N/A"}</p>
              </div>
              <Separator orientation="vertical" />
              <div>
                <span className="text-muted-foreground">License</span>
                <p className="font-medium">{assessment.license ?? "N/A"}</p>
              </div>
            </div>
          </div>
          <Card className="bg-muted/40">
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Risk Assessment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Score: {assessment.riskScore}/100 (lower is better)
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize text-sm">
                  {assessment.riskCategory}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Maintenance Health */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Maintenance Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            title="Last Commit"
            value={
              assessment.daysSinceLastCommit !== null
                ? `${assessment.daysSinceLastCommit}d ago`
                : "N/A"
            }
            icon={<Calendar className={iconClass} />}
            description="Days since most recent commit"
          />
          <MetricCard
            title="Commits (90d)"
            value={assessment.commitsLast90Days ?? "N/A"}
            icon={<GitCommitHorizontal className={iconClass} />}
            description="Recent activity level"
          />
          <MetricCard
            title="Last Release"
            value={
              assessment.daysSinceLastRelease !== null
                ? `${assessment.daysSinceLastRelease}d ago`
                : "N/A"
            }
            icon={<Tag className={iconClass} />}
            description="Release cadence"
          />
          <MetricCard
            title="Open Issues"
            value={
              assessment.openIssuesPercent !== null
                ? `${assessment.openIssuesPercent}%`
                : "N/A"
            }
            icon={<AlertCircle className={iconClass} />}
            description="Ratio of open to total issues"
          />
          <MetricCard
            title="Resolution Time"
            value={
              assessment.medianIssueResolutionDays !== null
                ? `${assessment.medianIssueResolutionDays}d`
                : "N/A"
            }
            icon={<Clock className={iconClass} />}
            description="Median days to close issues"
          />
          <MetricCard
            title="Open PRs"
            value={assessment.openPrsCount ?? "N/A"}
            icon={<GitPullRequest className={iconClass} />}
            description="Pending contributions"
          />
        </div>
      </section>

      {/* Footer */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
        <Clock className="w-4 h-4" />
        <span>
          Last analyzed: {new Date(assessment.analyzedAt).toLocaleString()}
        </span>
      </div>
    </main>
  );
}

const iconClass = "w-4 h-4 text-muted-foreground";

function MetricCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
