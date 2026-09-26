ALTER TABLE "profiles" ADD COLUMN "support_billing" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "support_period_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "support_subscription_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "billing_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "ai_messages" SET "credits" = 1 WHERE "role" = 'user';--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_support_billing_check" CHECK ("profiles"."support_billing" in ('none','month','subscribe'));--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_billing_status_check" CHECK ("workspaces"."billing_status" in ('none','active','past_due','canceled'));