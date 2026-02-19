export interface RepositoryRef {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string | null;
  createdAt: number;
  updatedAt: number;
}
