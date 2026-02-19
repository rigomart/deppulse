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
  token: string,
): Promise<CommitActivityResult> {
  const startedAt = Date.now();
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/commit_activity`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      signal: controller.signal,
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
      endpoint: `REST CommitActivity (${owner}/${repo})`,
      durationMs,
      status: response.status,
    });

    if (normalizedStatus !== 200) {
      return { status: normalizedStatus, weeks: [] };
    }

    const payload: unknown = await response.json();
    const weeks = Array.isArray(payload)
      ? payload.filter((week): week is CommitActivityWeekResponse =>
          isCommitActivityWeekResponse(week),
        )
      : [];

    return { status: 200, weeks };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
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
  } finally {
    clearTimeout(timeoutId);
  }
}
