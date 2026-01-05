import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

interface GitHubRateLimit {
  limit: number;
  remaining: number;
  used: number;
  resetAt: Date;
}

interface GitHubApiLogContext {
  endpoint: string;
  cost?: number;
  rateLimit?: GitHubRateLimit;
  durationMs: number;
}

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Simple structured logger for server-side operations.
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.debug(`[${formatTimestamp()}] DEBUG: ${message}`, context ?? "");
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.info(`[${formatTimestamp()}] INFO: ${message}`, context ?? "");
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(`[${formatTimestamp()}] WARN: ${message}`, context ?? "");
    }
  },

  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog("error")) {
      console.error(`[${formatTimestamp()}] ERROR: ${message}`, context ?? "");
    }
  },

  /**
   * Log GitHub API request with rate limit info.
   */
  githubApi(ctx: GitHubApiLogContext) {
    if (!shouldLog("info")) return;

    const parts = [
      `GitHub API: ${ctx.endpoint}`,
      `duration=${formatDuration(ctx.durationMs)}`,
    ];

    if (ctx.cost !== undefined) {
      parts.push(`cost=${ctx.cost}`);
    }

    if (ctx.rateLimit) {
      parts.push(`remaining=${ctx.rateLimit.remaining}/${ctx.rateLimit.limit}`);

      // Warn if rate limit is getting low
      const percentRemaining =
        (ctx.rateLimit.remaining / ctx.rateLimit.limit) * 100;
      if (percentRemaining < 10) {
        const resetIn = Math.max(
          0,
          ctx.rateLimit.resetAt.getTime() - Date.now(),
        );
        const resetMinutes = Math.ceil(resetIn / 60000);
        logger.warn(
          `GitHub rate limit low! Resets in ${resetMinutes} minutes`,
          {
            remaining: ctx.rateLimit.remaining,
            limit: ctx.rateLimit.limit,
            resetAt: ctx.rateLimit.resetAt.toISOString(),
          },
        );
      }
    }

    console.info(`[${formatTimestamp()}] INFO: ${parts.join(" | ")}`);
  },
};

/**
 * Parse rate limit headers from GitHub REST API response.
 */
export function parseRestRateLimit(
  headers: Headers,
): GitHubRateLimit | undefined {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const used = headers.get("x-ratelimit-used");
  const reset = headers.get("x-ratelimit-reset");

  if (!limit || !remaining || !reset) {
    return undefined;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    used: used ? parseInt(used, 10) : 0,
    resetAt: new Date(parseInt(reset, 10) * 1000),
  };
}

/**
 * Parse rate limit from GitHub GraphQL API response.
 */
export function parseGraphQLRateLimit(
  rateLimit:
    | { limit: number; remaining: number; cost: number; resetAt: string }
    | undefined,
): { rateLimit: GitHubRateLimit; cost: number } | undefined {
  if (!rateLimit) {
    return undefined;
  }

  return {
    cost: rateLimit.cost,
    rateLimit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      used: rateLimit.limit - rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt),
    },
  };
}
