import "server-only";

import type { AnalysisRun } from "@/lib/domain/assessment";
import {
  findLatestAssessmentRunByRepositoryId,
  listAssessmentRunsByRepositoryId,
  listRecentCompletedAssessmentRuns,
} from "@/lib/persistence/analysis-run";
import { findRepositoryByFullName } from "@/lib/persistence/repository";

export async function findLatestAssessmentRunBySlug(
  owner: string,
  project: string,
): Promise<AnalysisRun | null> {
  const fullName = `${owner}/${project}`;
  const repository = await findRepositoryByFullName(fullName);

  if (!repository) {
    return null;
  }

  return findLatestAssessmentRunByRepositoryId(repository.id);
}

export async function listRecentCompletedAssessments(
  limit: number,
): Promise<AnalysisRun[]> {
  const runs = await listRecentCompletedAssessmentRuns(limit * 4);
  const unique: AnalysisRun[] = [];
  const seen = new Set<number>();

  for (const run of runs) {
    if (seen.has(run.repository.id)) continue;
    unique.push(run);
    seen.add(run.repository.id);
    if (unique.length >= limit) break;
  }

  return unique;
}

export async function listAssessmentRunHistoryBySlug(
  owner: string,
  project: string,
  limit: number,
): Promise<AnalysisRun[]> {
  const fullName = `${owner}/${project}`;
  const repository = await findRepositoryByFullName(fullName);

  if (!repository) {
    return [];
  }

  return listAssessmentRunsByRepositoryId(repository.id, limit);
}
