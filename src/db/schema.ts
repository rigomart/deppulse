import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { MaintenanceCategory, MaturityTier } from "@/lib/maintenance";

export const assessments = pgTable(
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
    daysSinceLastCommit: integer("days_since_last_commit"),
    commitsLast90Days: integer("commits_last_90_days"),
    daysSinceLastRelease: integer("days_since_last_release"),
    openIssuesPercent: real("open_issues_percent"),
    medianIssueResolutionDays: real("median_issue_resolution_days"),
    openPrsCount: integer("open_prs_count"),
    issuesCreatedLast90Days: integer("issues_created_last_90_days"),
    isArchived: boolean("is_archived").default(false),
    maintenanceCategory: text("maintenance_category").notNull(),
    maintenanceScore: integer("maintenance_score"),
    maturityTier: text("maturity_tier"),
    analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("assessments_full_name_idx").on(table.fullName),
    index("assessments_analyzed_at_idx").on(table.analyzedAt),
  ],
);

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type { MaintenanceCategory, MaturityTier };
