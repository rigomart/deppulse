ALTER TABLE "assessments" ADD COLUMN "status" text DEFAULT 'scoring' NOT NULL;--> statement-breakpoint
UPDATE "assessments" SET "status" = 'complete' WHERE "maintenance_score" IS NOT NULL;