ALTER TABLE "properties" ADD COLUMN "bedrooms" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "bathrooms" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "total_floors" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "condition" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "available_from" date;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "dues_amount" numeric;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_condition_check" CHECK ("properties"."condition" is null or "properties"."condition" in ('new','renovated','good','fair','needs_work'));