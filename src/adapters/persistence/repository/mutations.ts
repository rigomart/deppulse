import "server-only";

import { db } from "@/db/drizzle";
import { repositories } from "@/db/schema";
import type { RepositoryRef } from "@/lib/domain/repository";
import { mapRepositoryRow } from "./mappers";

export async function upsertRepository(input: {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string | null;
}): Promise<RepositoryRef> {
  const now = new Date();
  const [repository] = await db
    .insert(repositories)
    .values({
      owner: input.owner,
      name: input.name,
      fullName: input.fullName,
      defaultBranch: input.defaultBranch,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: repositories.fullName,
      set: {
        owner: input.owner,
        name: input.name,
        defaultBranch: input.defaultBranch,
        updatedAt: now,
      },
    })
    .returning();

  return mapRepositoryRow(repository);
}
