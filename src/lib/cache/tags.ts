export const RECENT_ANALYSES_TAG = "recent-analyses";

export function getProjectTag(owner: string, project: string): string {
  return `project:${owner}/${project}`;
}
