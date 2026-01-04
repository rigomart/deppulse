import type { Metadata, ResolvingMetadata } from "next";
import { getCachedAssessment, getOrAnalyzeProject } from "@/db/queries";
import { MaintenanceHealth } from "./_components/maintenance-health";
import { ProjectHeader } from "./_components/project-header";

// Cache rendered pages for 1 hour
export const revalidate = 3600;

type Props = {
  params: Promise<{ owner: string; project: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { owner, project } = await params;

  // Use cache for metadata - fast path for homepage navigation
  const assessment = await getCachedAssessment(owner, project);

  if (!assessment) {
    // Direct link to new project - page will handle fetching
    return {
      title: `${owner}/${project} - Analyzing...`,
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

  // Try cache first (fast path for homepage navigation)
  let assessment = await getCachedAssessment(owner, project);

  // Fallback for direct links to new/stale projects
  if (!assessment) {
    assessment = await getOrAnalyzeProject(owner, project);
  }

  return (
    <main className="space-y-6">
      <ProjectHeader assessment={assessment} />
      <MaintenanceHealth assessment={assessment} />
    </main>
  );
}
