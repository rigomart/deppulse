import "server-only";

import { updateTag } from "next/cache";
import { getProjectTag, RECENT_ANALYSES_TAG } from "./tags";

export function invalidateProjectCache(owner: string, project: string): void {
  updateTag(getProjectTag(owner, project));
  updateTag(RECENT_ANALYSES_TAG);
}
