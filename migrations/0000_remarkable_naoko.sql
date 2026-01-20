CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"full_name" text NOT NULL,
	"description" text,
	"stars" integer DEFAULT 0,
	"forks" integer DEFAULT 0,
	"avatar_url" text,
	"html_url" text,
	"license" text,
	"language" text,
	"repository_created_at" timestamp,
	"last_commit_at" timestamp,
	"last_release_at" timestamp,
	"last_closed_issue_at" timestamp,
	"commits_last_year" integer,
	"open_issues_percent" real,
	"open_issues_count" integer,
	"closed_issues_count" integer,
	"median_issue_resolution_days" real,
	"open_prs_count" integer,
	"issues_created_last_year" integer,
	"is_archived" boolean DEFAULT false,
	"commit_activity" jsonb,
	"releases" jsonb,
	"maintenance_score" integer,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_full_name_idx" ON "assessments" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "assessments_analyzed_at_idx" ON "assessments" USING btree ("analyzed_at");