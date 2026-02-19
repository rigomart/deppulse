import type { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import { logger } from "@/lib/logger.core";
import type { CommitActivityResult, CommitActivityWeekResponse } from "./types";

function isCommitActivityWeekResponse(
  value: unknown,
): value is CommitActivityWeekResponse {
  if (!value || typeof value !== "object") return false;

  if (!("week" in value) || typeof value.week !== "number") return false;
  if (!("total" in value) || typeof value.total !== "number") return false;
  if (!("days" in value) || !Array.isArray(value.days)) return false;

  return (
    value.days.length === 7 &&
    value.days.every((day) => typeof day === "number")
  );
}

export async function fetchCommitActivity(
  owner: string,
  repo: string,
  client: Octokit,
): Promise<CommitActivityResult> {
  const startedAt = Date.now();

  try {
    const response = await client.request(
      "GET /repos/{owner}/{repo}/stats/commit_activity",
      { owner, repo },
    );

    const durationMs = Date.now() - startedAt;
    logger.api({
      service: "GitHub",
      endpoint: `REST CommitActivity (${owner}/${repo})`,
      durationMs,
      status: response.status,
    });

    if (response.status === 202) {
      return { status: 202, weeks: [] };
    }

    const weeks = Array.isArray(response.data)
      ? response.data.filter((week): week is CommitActivityWeekResponse =>
          isCommitActivityWeekResponse(week),
        )
      : [];

    return { status: 200, weeks };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    if (error instanceof RequestError) {
      logger.api({
        service: "GitHub",
        endpoint: `REST CommitActivity (${owner}/${repo})`,
        durationMs,
        status: error.status,
      });

      const status =
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404 ||
        error.status === 422
          ? (error.status as 403 | 404)
          : 500;
      return { status, weeks: [] };
    }

    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = error instanceof Error ? error.message : String(error);
    logger.api({
      service: "GitHub",
      endpoint: `REST CommitActivity (${owner}/${repo})`,
      durationMs,
      status: isAbort ? 408 : 500,
      error: isAbort ? "Request timed out" : message,
    });
    return { status: 500, weeks: [] };
  }
}
