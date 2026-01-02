import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  GitCommitHorizontal,
  GitPullRequest,
  Tag,
} from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCachedAssessment } from "@/lib/data";

type Props = {
  params: Promise<{ owner: string; repo: string }>;
};

/**
 * Builds page metadata for a repository route based on its cached assessment.
 *
 * @param params - A promise resolving to route parameters containing `owner` and `repo`
 * @returns A Metadata object for the repository page. If no assessment exists, returns a metadata object with `title` set to "Repository Not Found". If an assessment exists, returns metadata with a title and description reflecting the repository's full name, risk category, and score, plus a canonical alternate, Open Graph fields (`title`, `description`, `type: "website"`), and Twitter card settings (`summary_large_image`, `title`, `description`).
 */
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

/**
 * Render the repository risk assessment page for a given owner and repository.
 *
 * Renders a detailed view with repository title and description, a risk panel showing score and category, a responsive grid of six metric cards (last commit, commits in 90 days, last release, open issues percentage, median issue resolution time, open PRs), and a footer showing when the assessment was last analyzed. If no assessment is found the route resolves to a 404 page.
 *
 * @param params - A Promise resolving to an object with `owner` and `repo` string properties identifying the repository to render
 * @returns The JSX element for the repository assessment page
 */
export default async function RepoPage({ params }: Props) {
  const { owner, repo } = await params;

  const assessment = await getCachedAssessment(owner, repo);

  if (!assessment) {
    notFound();
  }

  return (
    <main className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
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
          <div className="flex items-center gap-4 bg-card border p-3 rounded-lg shadow-sm">
            <div className="text-left">
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                Risk Level
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Score: {assessment.riskScore}/100
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm capitalize">
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
          description="Days since most recent commit"
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-card rounded-xl border">
        <Clock className="w-4 h-4" />
        <span>
          Last analyzed: {new Date(assessment.analyzedAt).toLocaleString()}
        </span>
      </div>
    </main>
  );
}

/**
 * Render a compact metric card showing a title, prominent value, an icon, and a short description.
 *
 * @param title - Metric title displayed in the card header
 * @param value - Primary metric value shown prominently
 * @param icon - Icon node displayed in the header alongside the title
 * @param description - Short explanatory text displayed beneath the value
 * @returns A Card element containing the metric UI
 */
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
      <CardHeader className="flex flex-row items-center justify-between">
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