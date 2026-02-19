import "server-only";

import { logger } from "@/lib/logger";
import type { CommitActivityResult } from "./types";

function getAuthHeaders(): HeadersInit {
  if (!process.env.GITHUB_PAT) {
    throw new Error("GITHUB_PAT environment variable is required");
  }

  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_PAT}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function fetchCommitActivity(
  owner: string,
  repo: string,
): Promise<CommitActivityResult> {
  const startedAt = Date.now();
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/commit_activity`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    const durationMs = Date.now() - startedAt;
    const normalizedStatus =
      response.status === 200 ||
      response.status === 202 ||
      response.status === 403 ||
      response.status === 404
        ? response.status
        : 500;

    logger.api({
      service: "GitHub",
      endpoint: `REST CommitActivity (${owner}/${repo}) status=${response.status}`,
      durationMs,
    });

    if (normalizedStatus !== 200) {
      return { status: normalizedStatus, weeks: [] };
    }

    const payload: unknown = await response.json();
    const weeks = Array.isArray(payload)
      ? payload.filter((week) => {
          return (
            typeof week.week === "number" &&
            typeof week.total === "number" &&
            Array.isArray(week.days) &&
            week.days.length === 7
          );
        })
      : [];

    return { status: 200, weeks };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    logger.api({
      service: "GitHub",
      endpoint: `REST CommitActivity (${owner}/${repo}) error=${message}`,
      durationMs,
    });
    return { status: 500, weeks: [] };
  }
}
