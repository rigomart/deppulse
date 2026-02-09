import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { repositories } from "@/db/schema";
import type { RepositoryRef } from "@/lib/domain/repository";
import { mapRepositoryRow } from "./mappers";

export async function findRepositoryByFullName(
  fullName: string,
): Promise<RepositoryRef | null> {
  const repository = await db.query.repositories.findFirst({
    where: eq(repositories.fullName, fullName),
  });

  return repository ? mapRepositoryRow(repository) : null;
}

export async function findRepositoryById(
  id: number,
): Promise<RepositoryRef | null> {
  const repository = await db.query.repositories.findFirst({
    where: eq(repositories.id, id),
  });

  return repository ? mapRepositoryRow(repository) : null;
}
