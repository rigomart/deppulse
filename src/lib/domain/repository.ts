export interface RepositoryRef {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string | null;
  createdAt: Date;
  updatedAt: Date;
}
