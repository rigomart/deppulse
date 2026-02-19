import "server-only";

import { findProjectViewBySlug } from "@/adapters/persistence/project-view";
import { findLatestAssessmentRunBySlug } from "@/core/assessment";

export async function getProjectAnalysisStatus(owner: string, project: string) {
  const normalizedOwner = owner.trim().toLowerCase();
  const normalizedProject = project.trim().toLowerCase();
  const [latestRun, projectView] = await Promise.all([
    findLatestAssessmentRunBySlug(normalizedOwner, normalizedProject),
    findProjectViewBySlug(normalizedOwner, normalizedProject),
  ]);

  return {
    repository: latestRun?.repository ?? {
      id: 0,
      owner: normalizedOwner,
      name: normalizedProject,
      fullName: `${normalizedOwner}/${normalizedProject}`,
      defaultBranch: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    latestRun,
    viewReady:
      projectView?.runState === "complete" ||
      projectView?.runState === "partial",
  };
}
