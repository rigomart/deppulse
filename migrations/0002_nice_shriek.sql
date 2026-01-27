CREATE TABLE "analysis_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"status" text DEFAULT 'metrics_fetched' NOT NULL,
	"metrics_json" jsonb,
	"commit_activity_json" jsonb,
	"score_breakdown_json" jsonb,
	"score" integer,
	"category" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_code" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"default_branch" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_runs_repository_id_idx" ON "analysis_runs" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_repository_completed_idx" ON "analysis_runs" USING btree ("repository_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_full_name_idx" ON "repositories" USING btree ("full_name");