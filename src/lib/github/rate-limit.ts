import type { GraphQLRateLimitResponse, RateLimit } from "./types";

/**
 * Parse rate limit headers from GitHub REST API response.
 */
export function parseRestRateLimit(headers: Headers): RateLimit | undefined {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  if (!limit || !remaining || !reset) {
    return undefined;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetAt: new Date(parseInt(reset, 10) * 1000),
  };
}

/**
 * Parse rate limit from GitHub GraphQL API response.
 */
export function parseGraphQLRateLimit(
  rateLimit: GraphQLRateLimitResponse | undefined,
): { rateLimit: RateLimit; cost: number } | undefined {
  if (!rateLimit) {
    return undefined;
  }

  return {
    cost: rateLimit.cost,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt),
    },
  };
}
