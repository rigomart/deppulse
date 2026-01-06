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
    commitsLastYear: integer("commits_last_year"),
    daysSinceLastRelease: integer("days_since_last_release"),
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
    issueActivity:
      jsonb("issue_activity").$type<
        Array<{ week: string; opened: number; closed: number }>
      >(),
    releases:
      jsonb("releases").$type<
        Array<{ tagName: string; name: string | null; publishedAt: string }>
      >(),
    maintenanceScore: integer("maintenance_score"),
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
