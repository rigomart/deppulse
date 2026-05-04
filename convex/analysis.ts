import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import { v } from "convex/values";
import type { MetricsSnapshot } from "../src/lib/domain/assessment";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import {
  COMMIT_ACTIVITY_DELAYED_RETRY_MS,
  COMMIT_ACTIVITY_MAX_ATTEMPTS,
  COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS,
} from "./_shared/constants";
import {
  buildQueryVariables,
  buildSnapshotFromGraphQL,
  classifyCommitActivityHttpError,
  mapWeeksToCommitActivity,
  parseCommitActivityWeeks,
  type RawCommitWeek,
  REPO_METRICS_QUERY,
  type RepoMetricsGraphQLResponse,
} from "./_shared/github_snapshot";
import { triggerSource } from "./schema";

async function fetchGitHubGraphQL(
  client: Octokit,
  owner: string,
  repo: string,
): Promise<MetricsSnapshot> {
  const now = Date.now();
  const variables = buildQueryVariables(owner, repo, now);
  const data = await client.graphql<RepoMetricsGraphQLResponse>(
    REPO_METRICS_QUERY,
    variables,
  );
  return buildSnapshotFromGraphQL(data, owner, repo, now);
}

interface CommitActivityApiResult {
  status: 200 | 202 | 403 | 404 | 500;
  weeks: RawCommitWeek[];
}

async function fetchCommitActivityRest(
  client: Octokit,
  owner: string,
  repo: string,
): Promise<CommitActivityApiResult> {
  try {
    const response = await client.request(
      "GET /repos/{owner}/{repo}/stats/commit_activity",
      { owner, repo },
    );

    if (response.status === 202) {
      return { status: 202, weeks: [] };
    }

    return { status: 200, weeks: parseCommitActivityWeeks(response.data) };
  } catch (error) {
    if (error instanceof RequestError) {
      console.warn(
        `fetchCommitActivityRest: ${owner}/${repo} returned HTTP ${error.status}`,
      );
      const status =
        classifyCommitActivityHttpError(error.status) === "unavailable"
          ? 403
          : 500;
      return { status, weeks: [] };
    }

    console.error(
      `fetchCommitActivityRest failed for ${owner}/${repo}:`,
      error instanceof Error ? error.message : String(error),
    );
    return { status: 500, weeks: [] };
  }
}

async function runAnalysisPipeline(
  ctx: {
    runMutation: typeof internalAction.prototype.ctx.runMutation;
    scheduler: typeof internalAction.prototype.ctx.scheduler;
  },
  client: Octokit,
  runId: Id<"analysisRuns">,
  owner: string,
  project: string,
): Promise<void> {
  await ctx.runMutation(internal.analysisRuns.updateRunState, {
    runId,
    status: "running",
    runState: "running",
    progressStep: "metrics",
  });

  const metricsSnapshot = await fetchGitHubGraphQL(client, owner, project);

  await ctx.runMutation(internal.analysisRuns.updateRunState, {
    runId,
    status: "running",
    runState: "running",
    progressStep: "commit_activity",
    metricsJson: metricsSnapshot,
    attemptCount: 0,
  });

  await ctx.scheduler.runAfter(
    0,
    internal.analysis.fetchCommitActivityWithRetry,
    { runId, attempt: 1 },
  );
}

export const executeAnalysis = internalAction({
  args: {
    runId: v.id("analysisRuns"),
  },
  handler: async (ctx, { runId }) => {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error("GITHUB_PAT env var is not set");
    const client = new Octokit({ auth: token });

    const run = await ctx.runQuery(internal.analysisRuns.internalGetById, {
      runId,
    });
    if (!run) {
      console.warn(`executeAnalysis: Run ${runId} not found, skipping`);
      return;
    }

    const { owner, name: project } = run.repository;

    try {
      await runAnalysisPipeline(ctx, client, runId, owner, project);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "failed",
          runState: "failed",
          errorCode: "metrics_fetch_failed",
          errorMessage: message.slice(0, 500),
        });
      } catch (innerError) {
        console.error(
          `executeAnalysis: Could not finalize run ${runId} after error:`,
          innerError,
        );
      }
    }
  },
});

export const analyzeProject = action({
  args: {
    owner: v.string(),
    project: v.string(),
    triggerSource: v.optional(triggerSource),
  },
  handler: async (ctx, args): Promise<{ owner: string; project: string }> => {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error("GITHUB_PAT env var is not set");
    const client = new Octokit({ auth: token });

    const result = await ctx.runMutation(internal.analysisRuns.startOrReuse, {
      owner: args.owner,
      project: args.project,
      triggerSource: args.triggerSource,
    });

    if (result.alreadyComplete || result.alreadyActive) {
      return { owner: result.owner, project: result.project };
    }

    const { runId, owner, project } = result;

    try {
      await runAnalysisPipeline(ctx, client, runId, owner, project);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.analysisRuns.finalizeRun, {
        runId,
        status: "failed",
        runState: "failed",
        errorCode: "metrics_fetch_failed",
        errorMessage: message.slice(0, 500),
      });
      throw error;
    }

    return { owner, project };
  },
});

export const fetchCommitActivityWithRetry = internalAction({
  args: {
    runId: v.id("analysisRuns"),
    attempt: v.number(),
  },
  handler: async (ctx, { runId, attempt }) => {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error("GITHUB_PAT env var is not set");
    const client = new Octokit({ auth: token });

    const run = await ctx.runQuery(internal.analysisRuns.internalGetById, {
      runId,
    });
    if (!run) {
      console.warn(
        `fetchCommitActivityWithRetry: Run ${runId} not found, skipping`,
      );
      return;
    }

    const snapshot = run.metrics as MetricsSnapshot | null;
    if (!snapshot) {
      console.error(
        `fetchCommitActivityWithRetry: Run ${runId} has no metrics snapshot (state: ${run.runState})`,
      );
      await ctx.runMutation(internal.analysisRuns.finalizeRun, {
        runId,
        status: "failed",
        runState: "failed",
        errorCode: "missing_metrics_snapshot",
        errorMessage:
          "Internal error: metrics were not saved before commit activity fetch.",
      });
      return;
    }

    const { owner, name: project } = run.repository;

    try {
      const result = await fetchCommitActivityRest(client, owner, project);
      const now = new Date().toISOString();

      if (result.status === 200) {
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "ready",
            attempts: attempt,
            lastAttemptedAt: now,
            errorMessage: null,
            weekly: mapWeeksToCommitActivity(result.weeks),
          },
        };

        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "complete",
          runState: "complete",
          metricsJson: updatedSnapshot,
        });
        return;
      }

      if (result.status === 403 || result.status === 404) {
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "failed",
            attempts: attempt,
            lastAttemptedAt: now,
            errorMessage: "Commit history isn't available for this repository.",
            weekly: [],
          },
        };

        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "partial",
          runState: "partial",
          metricsJson: updatedSnapshot,
          errorCode: "commit_activity_unavailable",
          errorMessage: "Commit history isn't available for this repository.",
        });
        return;
      }

      // 202 or transient error — retry or give up
      if (attempt >= COMMIT_ACTIVITY_MAX_ATTEMPTS) {
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "failed",
            attempts: attempt,
            lastAttemptedAt: now,
            errorMessage:
              "Commit history couldn't be loaded for this repository.",
            weekly: [],
          },
        };

        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "partial",
          runState: "partial",
          metricsJson: updatedSnapshot,
          errorCode: "commit_activity_retry_limit",
          errorMessage:
            "Commit history couldn't be loaded for this repository.",
        });

        await ctx.scheduler.runAfter(
          COMMIT_ACTIVITY_DELAYED_RETRY_MS,
          internal.analysis.delayedCommitActivityRetry,
          { runId },
        );
        return;
      }

      // Schedule retry
      const delaySeconds =
        COMMIT_ACTIVITY_RETRY_DELAYS_SECONDS[attempt - 1] ?? 13;

      await ctx.runMutation(internal.analysisRuns.updateRunState, {
        runId,
        runState: "waiting_retry",
        attemptCount: attempt,
        metricsJson: {
          ...snapshot,
          commitActivity: {
            ...snapshot.commitActivity,
            state: "pending",
            attempts: attempt,
            lastAttemptedAt: now,
          },
        },
      });

      await ctx.scheduler.runAfter(
        delaySeconds * 1000,
        internal.analysis.fetchCommitActivityWithRetry,
        { runId, attempt: attempt + 1 },
      );
    } catch (error) {
      console.error(
        `fetchCommitActivityWithRetry: Unhandled error for run ${runId}, attempt ${attempt}:`,
        error instanceof Error ? error.message : String(error),
      );
      try {
        await ctx.runMutation(internal.analysisRuns.finalizeRun, {
          runId,
          status: "failed",
          runState: "failed",
          errorCode: "commit_activity_unhandled_error",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown error",
        });
      } catch (innerError) {
        console.error(
          `fetchCommitActivityWithRetry: Could not finalize run ${runId} after error:`,
          innerError,
        );
      }
    }
  },
});

export const delayedCommitActivityRetry = internalAction({
  args: {
    runId: v.id("analysisRuns"),
  },
  handler: async (ctx, { runId }) => {
    try {
      const token = process.env.GITHUB_PAT;
      if (!token) throw new Error("GITHUB_PAT env var is not set");
      const client = new Octokit({ auth: token });

      const run = await ctx.runQuery(internal.analysisRuns.internalGetById, {
        runId,
      });
      if (!run) {
        console.warn(
          `delayedCommitActivityRetry: Run ${runId} not found, skipping`,
        );
        return;
      }

      if (
        run.runState !== "partial" ||
        run.errorCode !== "commit_activity_retry_limit"
      ) {
        console.info(
          `delayedCommitActivityRetry: Run ${runId} no longer eligible (runState=${run.runState}, errorCode=${run.errorCode}), skipping`,
        );
        return;
      }

      const snapshot = run.metrics as MetricsSnapshot | null;
      if (!snapshot) return;

      const { owner, name: project } = run.repository;
      const result = await fetchCommitActivityRest(client, owner, project);

      if (result.status === 200) {
        const now = new Date().toISOString();
        const updatedSnapshot: MetricsSnapshot = {
          ...snapshot,
          commitActivity: {
            state: "ready",
            attempts:
              (snapshot.commitActivity?.attempts ??
                COMMIT_ACTIVITY_MAX_ATTEMPTS) + 1,
            lastAttemptedAt: now,
            errorMessage: null,
            weekly: mapWeeksToCommitActivity(result.weeks),
          },
        };

        await ctx.runMutation(internal.analysisRuns.upgradePartialRun, {
          runId,
          metricsJson: updatedSnapshot,
        });
      } else {
        console.info(
          `delayedCommitActivityRetry: Run ${runId} delayed retry returned status ${result.status}, leaving as partial`,
        );
      }
    } catch (error) {
      console.error(
        `delayedCommitActivityRetry: Unhandled error for run ${runId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  },
});
