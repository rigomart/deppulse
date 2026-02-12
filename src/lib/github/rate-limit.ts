import type { GraphQLRateLimitResponse, RateLimit } from "./types";

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
