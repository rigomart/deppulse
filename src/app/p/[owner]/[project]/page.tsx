import type { Metadata, ResolvingMetadata } from "next";
import { getCachedAssessment, getOrAnalyzeProject } from "@/lib/data";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";

// Cache rendered pages for 1 hour, matching our data freshness threshold
export const revalidate = 3600;

type Props = {
  params: Promise<{ owner: string; project: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;
  const assessment = await getCachedAssessment(owner, project);

  if (!assessment) {
    return {
      title: "Project Not Found",
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
      canonical: `/p/${owner}/${project}`,
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

export default async function ProjectPage({ params }: Props) {
  const { owner, project } = await params;

  // getOrAnalyzeProject returns cached data if fresh, otherwise fetches from GitHub.
  // Throws on errors (not found, rate limit, etc.) which are caught by error.tsx.
  const assessment = await getOrAnalyzeProject(owner, project);

  return (
    <main className="space-y-6">
      <ProjectHeader assessment={assessment} />
      <MaintenanceHealth assessment={assessment} />
    </main>
  );
}
