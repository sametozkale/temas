ALTER TABLE "properties" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "properties_workspace_assigned_user_idx" ON "properties" USING btree ("workspace_id","assigned_user_id");--> statement-breakpoint
UPDATE "properties" p SET "assigned_user_id" = (
  SELECT m."user_id" FROM "workspace_members" m
  WHERE m."workspace_id" = p."workspace_id" AND m."role" = 'owner'
  ORDER BY m."created_at" ASC
  LIMIT 1
)
WHERE p."assigned_user_id" IS NULL;