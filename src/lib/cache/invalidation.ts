import "server-only";

import { updateTag } from "next/cache";
import { getProjectTag } from "./tags";

export function invalidateProjectCache(owner: string, project: string): void {
  updateTag(getProjectTag(owner, project));
}
