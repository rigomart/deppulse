import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import type { ProjectView } from "@/db/schema";
import { projectViews } from "@/db/schema";
import { findRepositoryByFullName } from "../repository";

export async function findProjectViewByRepositoryId(
  repositoryId: number,
): Promise<ProjectView | null> {
  const view = await db.query.projectViews.findFirst({
    where: eq(projectViews.repositoryId, repositoryId),
  });

  return view ?? null;
}

export async function findProjectViewBySlug(
  owner: string,
  project: string,
): Promise<ProjectView | null> {
  const fullName = `${owner}/${project}`;
  const repository = await findRepositoryByFullName(fullName);
  if (!repository) return null;

  return findProjectViewByRepositoryId(repository.id);
}
