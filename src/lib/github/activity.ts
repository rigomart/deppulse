import "server-only";

import { format } from "date-fns";
import { logger } from "../logger";
import { parseRestRateLimit } from "./rate-limit";
import type { CommitActivityStats } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-flight request deduplication for commit activity
const commitActivityRequests = new Map<
  string,
  Promise<Array<{ week: string; commits: number }>>
>();

/**
 * Fetch commit activity stats from GitHub REST API.
 * Returns weekly commit counts for the last 52 weeks.
 *
 * GitHub returns 202 when stats are being computed in the background.
 * We retry with exponential backoff until data is ready.
 *
 * Uses in-memory deduplication to prevent duplicate requests during streaming.
 */
export function fetchCommitActivity(
  owner: string,
  repo: string,
): Promise<Array<{ week: string; commits: number }>> {
  const key = `${owner}/${repo}`;

  // Return existing in-flight request if one exists
  const existing = commitActivityRequests.get(key);
  if (existing) {
    return existing;
  }

  // Create new request and store it
  const request = fetchCommitActivityInternal(owner, repo).finally(() => {
    // Clean up after request completes
    commitActivityRequests.delete(key);
  });

  commitActivityRequests.set(key, request);
  return request;
}

async function fetchCommitActivityInternal(
  owner: string,
  repo: string,
): Promise<Array<{ week: string; commits: number }>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`;
  const endpoint = `REST /repos/${owner}/${repo}/stats/commit_activity`;
  const maxRetries = 3;
  const delayMs = 2000;
  const timeoutMs = 10000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `token ${process.env.GITHUB_PAT}`,
          Accept: "application/vnd.github.v3+json",
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      // Timeout or network error - retry
      const isAbort = error instanceof Error && error.name === "AbortError";
      logger.api({
        service: "GitHub",
        endpoint: `${endpoint} (${isAbort ? "timeout" : "network error"}, attempt ${attempt}/${maxRetries})`,
        durationMs,
      });

      if (attempt < maxRetries) {
        await sleep(delayMs);
        continue;
      }
      return [];
    }

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const rateLimit = parseRestRateLimit(response.headers);

    // 202 means GitHub is computing stats - retry after delay
    if (response.status === 202) {
      logger.api({
        service: "GitHub",
        endpoint: `${endpoint} (computing, attempt ${attempt}/${maxRetries})`,
        durationMs,
        rateLimit,
      });

      if (attempt < maxRetries) {
        await sleep(delayMs); // 2s between retries
        continue;
      }
      return [];
    }

    if (!response.ok) {
      logger.api({
        service: "GitHub",
        endpoint: `${endpoint} (${response.status})`,
        durationMs,
        rateLimit,
      });
      return [];
    }

    const stats = await response.json();

    if (!Array.isArray(stats)) {
      logger.api({
        service: "GitHub",
        endpoint: `${endpoint} (invalid response)`,
        durationMs,
        rateLimit,
      });
      return [];
    }

    logger.api({
      service: "GitHub",
      endpoint,
      durationMs,
      rateLimit,
    });

    return stats.map((stat: CommitActivityStats) => ({
      week: format(new Date(stat.week * 1000), "yyyy-MM-dd"),
      commits: stat.total,
    }));
  }

  return [];
}
