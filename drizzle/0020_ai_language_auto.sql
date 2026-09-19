-- Match the prompt is the default AI language (docs/05 §2).
ALTER TABLE "profiles" ALTER COLUMN "ai_language" SET DEFAULT 'auto';
--> statement-breakpoint
UPDATE "profiles" SET "ai_language" = 'auto' WHERE "ai_language" = 'en';
