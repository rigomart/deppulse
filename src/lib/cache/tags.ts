export function getProjectTag(owner: string, project: string): string {
  return `project:${owner}/${project}`;
}

export function getRecentAnalysesTag(): string {
  return "recent-analyses";
}
