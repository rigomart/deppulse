CREATE TABLE "commit_activity_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"run_id" integer,
	"week_start" timestamp NOT NULL,
	"total_commits" integer DEFAULT 0 NOT NULL,
	"day_0" integer DEFAULT 0 NOT NULL,
	"day_1" integer DEFAULT 0 NOT NULL,
	"day_2" integer DEFAULT 0 NOT NULL,
	"day_3" integer DEFAULT 0 NOT NULL,
	"day_4" integer DEFAULT 0 NOT NULL,
	"day_5" integer DEFAULT 0 NOT NULL,
	"day_6" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_views" (
	"repository_id" integer PRIMARY KEY NOT NULL,
	"latest_run_id" integer,
	"run_state" text DEFAULT 'queued' NOT NULL,
	"progress_step" text DEFAULT 'bootstrap' NOT NULL,
	"snapshot_json" jsonb,
	"analyzed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "run_state" text DEFAULT 'complete' NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "progress_step" text DEFAULT 'finalize' NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "next_retry_at" timestamp;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "lock_token" text;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "workflow_id" text;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "trigger_source" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "commit_activity_points" ADD CONSTRAINT "commit_activity_points_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit_activity_points" ADD CONSTRAINT "commit_activity_points_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_latest_run_id_analysis_runs_id_fk" FOREIGN KEY ("latest_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commit_activity_points_repository_idx" ON "commit_activity_points" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "commit_activity_points_run_idx" ON "commit_activity_points" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commit_activity_points_repository_week_idx" ON "commit_activity_points" USING btree ("repository_id","week_start");--> statement-breakpoint
CREATE INDEX "project_views_latest_run_idx" ON "project_views" USING btree ("latest_run_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_state_retry_idx" ON "analysis_runs" USING btree ("run_state","next_retry_at");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_repository_active_idx" ON "analysis_runs" USING btree ("repository_id") WHERE "analysis_runs"."run_state" in ('queued', 'running', 'waiting_retry');