import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshButton } from "@/components/refresh-button";
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

  return (
    <div>
      <h1>{assessment.fullName}</h1>
      {assessment.description && <p>{assessment.description}</p>}

      <div>
        <strong>Risk: </strong>
        <span>{assessment.riskCategory}</span>
        <span> ({assessment.riskScore}/100)</span>
      </div>

      <div>
        <h2>Metrics</h2>
        <ul>
          <li>
            Days since last commit: {assessment.daysSinceLastCommit ?? "N/A"}
          </li>
          <li>Commits (90 days): {assessment.commitsLast90Days ?? "N/A"}</li>
          <li>
            Days since last release: {assessment.daysSinceLastRelease ?? "N/A"}
          </li>
          <li>Open issues %: {assessment.openIssuesPercent ?? "N/A"}</li>
          <li>
            Median issue resolution:{" "}
            {assessment.medianIssueResolutionDays ?? "N/A"} days
          </li>
          <li>Open PRs: {assessment.openPrsCount ?? "N/A"}</li>
        </ul>
      </div>

      <div>
        <p>Last analyzed: {new Date(assessment.analyzedAt).toLocaleString()}</p>
        <RefreshButton owner={owner} repo={repo} />
      </div>

      <Link href="/">Back to search</Link>
    </div>
  );
}
