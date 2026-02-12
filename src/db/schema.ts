import { relations } from "drizzle-orm";
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
import type { MetricsSnapshot } from "@/lib/domain/assessment";
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
    metricsJson: jsonb("metrics_json").$type<MetricsSnapshot>(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("analysis_runs_repository_id_idx").on(table.repositoryId),
    index("analysis_runs_repository_completed_idx").on(
      table.repositoryId,
      table.completedAt,
    ),
  ],
);

export const repositoriesRelations = relations(repositories, ({ many }) => ({
  runs: many(analysisRuns),
}));

export const analysisRunsRelations = relations(analysisRuns, ({ one }) => ({
  repository: one(repositories, {
    fields: [analysisRuns.repositoryId],
    references: [repositories.id],
  }),
}));

export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type NewAnalysisRun = typeof analysisRuns.$inferInsert;
