import type { Repository } from "@/db/schema";
import type { RepositoryRef } from "@/lib/domain/repository";

export function mapRepositoryRow(repository: Repository): RepositoryRef {
  return {
    id: repository.id,
    owner: repository.owner,
    name: repository.name,
    fullName: repository.fullName,
    defaultBranch: repository.defaultBranch,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
  };
}
