import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { ANALYSIS_FRESHNESS_MS, isTerminalRunState } from "./_shared/constants";
import { mapAnalysisRun } from "./_shared/mappers";
import {
  analysisRunState,
  analysisStatus,
  progressStep,
  triggerSource,
} from "./schema";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getByRepositorySlug = query({
  args: { owner: v.string(), project: v.string() },
  handler: async (ctx, { owner, project }) => {
    const fullName = `${owner.trim().toLowerCase()}/${project.trim().toLowerCase()}`;

    const repository = await ctx.db
      .query("repositories")
      .withIndex("by_fullName", (q) => q.eq("fullName", fullName))
      .unique();

    if (!repository) return null;

    const run = await ctx.db
      .query("analysisRuns")
      .withIndex("by_repositoryId", (q) => q.eq("repositoryId", repository._id))
      .order("desc")
      .first();

    if (!run) return null;

    return mapAnalysisRun(run, repository);
  },
});

export const getById = query({
  args: { runId: v.id("analysisRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) return null;

    const repository = await ctx.db.get(run.repositoryId);
    if (!repository) return null;

    return mapAnalysisRun(run, repository);
  },
});

export const internalGetById = internalQuery({
  args: { runId: v.id("analysisRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) return null;

    const repository = await ctx.db.get(run.repositoryId);
    if (!repository) return null;

    return mapAnalysisRun(run, repository);
  },
});

export const listRecentCompleted = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    // Fetch extra to allow deduplication by repository
    const runs = await ctx.db
      .query("analysisRuns")
      .withIndex("by_status_completedAt")
      .order("desc")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "complete"),
          q.eq(q.field("status"), "partial"),
        ),
      )
      .take(limit * 4);

    const unique: Array<ReturnType<typeof mapAnalysisRun>> = [];
    const seenRepoIds = new Set<string>();

    for (const run of runs) {
      if (seenRepoIds.has(run.repositoryId)) continue;

      const repository = await ctx.db.get(run.repositoryId);
      if (!repository) continue;

      unique.push(mapAnalysisRun(run, repository));
      seenRepoIds.add(run.repositoryId);

      if (unique.length >= limit) break;
    }

    return unique;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const startOrReuse = internalMutation({
  args: {
    owner: v.string(),
    project: v.string(),
    force: v.optional(v.boolean()),
    triggerSource: v.optional(triggerSource),
  },
  handler: async (ctx, args) => {
    const owner = args.owner.trim().toLowerCase();
    const project = args.project.trim().toLowerCase();
    const fullName = `${owner}/${project}`;

    const existingRepo = await ctx.db
      .query("repositories")
      .withIndex("by_fullName", (q) => q.eq("fullName", fullName))
      .unique();

    if (existingRepo && !args.force) {
      // Check for an active (non-terminal) run
      const activeRun = await ctx.db
        .query("analysisRuns")
        .withIndex("by_repositoryId", (q) =>
          q.eq("repositoryId", existingRepo._id),
        )
        .order("desc")
        .filter((q) =>
          q.or(
            q.eq(q.field("runState"), "queued"),
            q.eq(q.field("runState"), "running"),
            q.eq(q.field("runState"), "waiting_retry"),
          ),
        )
        .first();

      if (activeRun) {
        return {
          runId: activeRun._id,
          owner,
          project,
          alreadyComplete: false,
          alreadyActive: true,
        };
      }

      // Check for a fresh complete/partial run
      const latestRun = await ctx.db
        .query("analysisRuns")
        .withIndex("by_repositoryId", (q) =>
          q.eq("repositoryId", existingRepo._id),
        )
        .order("desc")
        .first();

      if (
        latestRun &&
        (latestRun.status === "complete" || latestRun.status === "partial")
      ) {
        const age = Date.now() - (latestRun.completedAt ?? latestRun.startedAt);
        if (age < ANALYSIS_FRESHNESS_MS) {
          return {
            runId: latestRun._id,
            owner,
            project,
            alreadyComplete: true,
            alreadyActive: false,
          };
        }
      }
    }

    // Upsert repository inline (avoids circular type reference from ctx.runMutation)
    let repoId: Id<"repositories">;
    if (existingRepo) {
      repoId = existingRepo._id;
    } else {
      repoId = await ctx.db.insert("repositories", {
        owner,
        name: project,
        fullName,
      });
    }

    // Double-check no active run was created concurrently
    if (!args.force) {
      const activeRun = await ctx.db
        .query("analysisRuns")
        .withIndex("by_repositoryId", (q) => q.eq("repositoryId", repoId))
        .order("desc")
        .filter((q) =>
          q.or(
            q.eq(q.field("runState"), "queued"),
            q.eq(q.field("runState"), "running"),
            q.eq(q.field("runState"), "waiting_retry"),
          ),
        )
        .first();

      if (activeRun) {
        return {
          runId: activeRun._id,
          owner,
          project,
          alreadyComplete: false,
          alreadyActive: true,
        };
      }
    }

    const now = Date.now();
    const runId = await ctx.db.insert("analysisRuns", {
      repositoryId: repoId,
      status: "queued",
      runState: "queued",
      progressStep: "bootstrap",
      attemptCount: 0,
      triggerSource: args.triggerSource ?? "homepage",
      startedAt: now,
      updatedAt: now,
    });

    return {
      runId,
      owner,
      project,
      alreadyComplete: false,
      alreadyActive: false,
    };
  },
});

export const updateRunState = internalMutation({
  args: {
    runId: v.id("analysisRuns"),
    status: v.optional(analysisStatus),
    runState: v.optional(analysisRunState),
    progressStep: v.optional(progressStep),
    attemptCount: v.optional(v.number()),
    metricsJson: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { runId, ...updates }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    if (isTerminalRunState(run.runState)) return;

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.runState !== undefined) patch.runState = updates.runState;
    if (updates.progressStep !== undefined)
      patch.progressStep = updates.progressStep;
    if (updates.attemptCount !== undefined)
      patch.attemptCount = updates.attemptCount;
    if (updates.metricsJson !== undefined)
      patch.metricsJson = updates.metricsJson;
    if (updates.errorCode !== undefined) patch.errorCode = updates.errorCode;
    if (updates.errorMessage !== undefined)
      patch.errorMessage = updates.errorMessage;

    await ctx.db.patch(runId, patch);
  },
});

export const finalizeRun = internalMutation({
  args: {
    runId: v.id("analysisRuns"),
    status: analysisStatus,
    runState: analysisRunState,
    metricsJson: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { runId, ...updates }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    if (isTerminalRunState(run.runState)) return;

    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: updates.status,
      runState: updates.runState,
      progressStep: "finalize" as const,
      updatedAt: now,
      completedAt: now,
    };

    if (updates.metricsJson !== undefined)
      patch.metricsJson = updates.metricsJson;
    if (updates.errorCode !== undefined) patch.errorCode = updates.errorCode;
    if (updates.errorMessage !== undefined)
      patch.errorMessage = updates.errorMessage;

    await ctx.db.patch(runId, patch);
  },
});
