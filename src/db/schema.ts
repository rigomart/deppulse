import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  CommitActivityEntry,
  MetricsSnapshot,
} from "@/lib/domain/assessment";
import type { AnalysisStatus, ScoreBreakdown } from "@/lib/domain/score";
import type { MaintenanceCategory } from "@/lib/maintenance";

export const legacyAssessments = pgTable(
  "assessments",
  {
    id: serial("id").primaryKey(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    stars: integer("stars").default(0),
    forks: integer("forks").default(0),
    avatarUrl: text("avatar_url"),
    htmlUrl: text("html_url"),
    license: text("license"),
    language: text("language"),
    repositoryCreatedAt: timestamp("repository_created_at"),
    lastCommitAt: timestamp("last_commit_at"),
    lastReleaseAt: timestamp("last_release_at"),
    lastClosedIssueAt: timestamp("last_closed_issue_at"),
    commitsLastYear: integer("commits_last_year"),
    openIssuesPercent: real("open_issues_percent"),
    openIssuesCount: integer("open_issues_count"),
    closedIssuesCount: integer("closed_issues_count"),
    medianIssueResolutionDays: real("median_issue_resolution_days"),
    openPrsCount: integer("open_prs_count"),
    issuesCreatedLastYear: integer("issues_created_last_year"),
    isArchived: boolean("is_archived").default(false),
    commitActivity:
      jsonb("commit_activity").$type<
        Array<{ week: string; commits: number }>
      >(),
    releases:
      jsonb("releases").$type<
        Array<{ tagName: string; name: string | null; publishedAt: string }>
      >(),
    maintenanceScore: integer("maintenance_score"),
    status: text("status").notNull().default("scoring"),
    analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("assessments_full_name_idx").on(table.fullName),
    index("assessments_analyzed_at_idx").on(table.analyzedAt),
  ],
);

export type LegacyAssessment = typeof legacyAssessments.$inferSelect;
export type NewLegacyAssessment = typeof legacyAssessments.$inferInsert;

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
      .default("metrics_fetched")
      .$type<AnalysisStatus>(),
    metricsJson: jsonb("metrics_json").$type<MetricsSnapshot>(),
    commitActivityJson: jsonb("commit_activity_json").$type<
      Array<CommitActivityEntry>
    >(),
    scoreBreakdownJson: jsonb("score_breakdown_json").$type<ScoreBreakdown>(),
    score: integer("score"),
    category: text("category").$type<MaintenanceCategory>(),
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
