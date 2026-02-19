import "server-only";

/**
 * Generic rate limit info for external APIs.
 */
export interface RateLimit {
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Context for logging external API requests.
 */
interface ApiLogContext {
  service: string;
  endpoint: string;
  durationMs: number;
  status?: number;
  error?: string;
  cost?: number;
  rateLimit?: RateLimit;
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
    console.debug(`[${formatTimestamp()}] DEBUG: ${message}`, context ?? "");
  },

  info(message: string, context?: Record<string, unknown>) {
    console.info(`[${formatTimestamp()}] INFO: ${message}`, context ?? "");
  },

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[${formatTimestamp()}] WARN: ${message}`, context ?? "");
  },

  error(message: string, context?: Record<string, unknown>) {
    console.error(`[${formatTimestamp()}] ERROR: ${message}`, context ?? "");
  },

  /**
   * Log external API request with optional rate limit info.
   */
  api(ctx: ApiLogContext) {
    const parts = [
      `${ctx.service} API: ${ctx.endpoint}`,
      `duration=${formatDuration(ctx.durationMs)}`,
    ];

    if (ctx.status !== undefined) {
      parts.push(`status=${ctx.status}`);
    }

    if (ctx.error) {
      parts.push(`error=${ctx.error}`);
    }

    if (ctx.cost !== undefined) {
      parts.push(`cost=${ctx.cost}`);
    }

    if (ctx.rateLimit) {
      parts.push(`remaining=${ctx.rateLimit.remaining}/${ctx.rateLimit.limit}`);
    }

    console.info(`[${formatTimestamp()}] INFO: ${parts.join(" | ")}`);
  },
};
