import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getCachedAssessment } from "@/lib/data";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { RepoFooter } from "./_components/repo-footer";
import { RepoHeader } from "./_components/repo-header";
import { RiskAndInfoSection } from "./_components/risk-and-info";

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
    <main className="space-y-6">
      <RepoHeader assessment={assessment} />
      <RiskAndInfoSection assessment={assessment} />
      <MaintenanceHealth assessment={assessment} />
      <RepoFooter assessment={assessment} />
    </main>
  );
}
