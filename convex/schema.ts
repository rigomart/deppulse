import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const analysisStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("partial"),
  v.literal("complete"),
  v.literal("failed"),
);

export const analysisRunState = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("waiting_retry"),
  v.literal("complete"),
  v.literal("failed"),
  v.literal("partial"),
);

export const progressStep = v.union(
  v.literal("bootstrap"),
  v.literal("metrics"),
  v.literal("commit_activity"),
  v.literal("finalize"),
);

export const triggerSource = v.union(
  v.literal("homepage"),
  v.literal("direct_visit"),
  v.literal("manual_refresh"),
  v.literal("page_visit"),
  v.literal("system"),
);

export default defineSchema({
  repositories: defineTable({
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.optional(v.string()),
  }).index("by_fullName", ["fullName"]),

  analysisRuns: defineTable({
    repositoryId: v.id("repositories"),
    status: analysisStatus,
    runState: analysisRunState,
    progressStep: progressStep,
    attemptCount: v.number(),
    triggerSource: triggerSource,
    metricsJson: v.optional(v.any()),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_repositoryId", ["repositoryId"])
    .index("by_repositoryId_runState", ["repositoryId", "runState"])
    .index("by_status_completedAt", ["status", "completedAt"]),
});
