import "server-only";

import { revalidateTag } from "next/cache";
import { getProjectTag, getRecentAnalysesTag } from "./tags";

export function invalidateProjectCache(owner: string, project: string): void {
  revalidateTag(getProjectTag(owner, project), "max");
}

export function invalidateRecentAnalysesCache(): void {
  revalidateTag(getRecentAnalysesTag(), "max");
}
