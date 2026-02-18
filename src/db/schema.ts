import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  AnalysisRunProgressStep,
  AnalysisRunState,
  AnalysisRunTriggerSource,
  MetricsSnapshot,
} from "@/lib/domain/assessment";
import type { AnalysisStatus } from "@/lib/domain/score";

export const repositories = pgTable(
  "repositories",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    defaultBranch: text("default_branch"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("repositories_full_name_idx").on(table.fullName)],
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: serial("id").primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    status: text("status")
      .notNull()
      .default("complete")
      .$type<AnalysisStatus>(),
    runState: text("run_state")
      .notNull()
      .default("complete")
      .$type<AnalysisRunState>(),
    progressStep: text("progress_step")
      .notNull()
      .default("finalize")
      .$type<AnalysisRunProgressStep>(),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at"),
    lockToken: text("lock_token"),
    lockedAt: timestamp("locked_at"),
    workflowId: text("workflow_id"),
    triggerSource: text("trigger_source")
      .notNull()
      .default("system")
      .$type<AnalysisRunTriggerSource>(),
    metricsJson: jsonb("metrics_json").$type<MetricsSnapshot>(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("analysis_runs_repository_id_idx").on(table.repositoryId),
    index("analysis_runs_state_retry_idx").on(
      table.runState,
      table.nextRetryAt,
    ),
    index("analysis_runs_repository_completed_idx").on(
      table.repositoryId,
      table.completedAt,
    ),
    uniqueIndex("analysis_runs_repository_active_idx")
      .on(table.repositoryId)
      .where(sql`${table.runState} in ('queued', 'running', 'waiting_retry')`),
  ],
);

export const projectViews = pgTable(
  "project_views",
  {
    repositoryId: integer("repository_id")
      .primaryKey()
      .references(() => repositories.id, { onDelete: "cascade" }),
    latestRunId: integer("latest_run_id").references(() => analysisRuns.id, {
      onDelete: "set null",
    }),
    runState: text("run_state")
      .notNull()
      .default("queued")
      .$type<AnalysisRunState>(),
    progressStep: text("progress_step")
      .notNull()
      .default("bootstrap")
      .$type<AnalysisRunProgressStep>(),
    snapshotJson: jsonb("snapshot_json").$type<MetricsSnapshot>(),
    analyzedAt: timestamp("analyzed_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("project_views_latest_run_idx").on(table.latestRunId)],
);

export const commitActivityPoints = pgTable(
  "commit_activity_points",
  {
    id: serial("id").primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    runId: integer("run_id").references(() => analysisRuns.id, {
      onDelete: "set null",
    }),
    weekStart: timestamp("week_start").notNull(),
    totalCommits: integer("total_commits").notNull().default(0),
    day0: integer("day_0").notNull().default(0),
    day1: integer("day_1").notNull().default(0),
    day2: integer("day_2").notNull().default(0),
    day3: integer("day_3").notNull().default(0),
    day4: integer("day_4").notNull().default(0),
    day5: integer("day_5").notNull().default(0),
    day6: integer("day_6").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("commit_activity_points_repository_idx").on(table.repositoryId),
    index("commit_activity_points_run_idx").on(table.runId),
    uniqueIndex("commit_activity_points_repository_week_idx").on(
      table.repositoryId,
      table.weekStart,
    ),
  ],
);

export const repositoriesRelations = relations(repositories, ({ many }) => ({
  runs: many(analysisRuns),
  commitActivityPoints: many(commitActivityPoints),
}));

export const analysisRunsRelations = relations(
  analysisRuns,
  ({ one, many }) => ({
    repository: one(repositories, {
      fields: [analysisRuns.repositoryId],
      references: [repositories.id],
    }),
    commitActivityPoints: many(commitActivityPoints),
  }),
);

export const projectViewsRelations = relations(projectViews, ({ one }) => ({
  repository: one(repositories, {
    fields: [projectViews.repositoryId],
    references: [repositories.id],
  }),
  latestRun: one(analysisRuns, {
    fields: [projectViews.latestRunId],
    references: [analysisRuns.id],
  }),
}));

export const commitActivityPointsRelations = relations(
  commitActivityPoints,
  ({ one }) => ({
    repository: one(repositories, {
      fields: [commitActivityPoints.repositoryId],
      references: [repositories.id],
    }),
    run: one(analysisRuns, {
      fields: [commitActivityPoints.runId],
      references: [analysisRuns.id],
    }),
  }),
);

export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type NewAnalysisRun = typeof analysisRuns.$inferInsert;
export type ProjectView = typeof projectViews.$inferSelect;
export type NewProjectView = typeof projectViews.$inferInsert;
export type CommitActivityPoint = typeof commitActivityPoints.$inferSelect;
export type NewCommitActivityPoint = typeof commitActivityPoints.$inferInsert;
