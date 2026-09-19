ALTER TABLE "integrations" DROP CONSTRAINT "integrations_workspace_kind_unique";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "integrations" i SET "user_id" = (
  SELECT m."user_id" FROM "workspace_members" m
  WHERE m."workspace_id" = i."workspace_id" AND m."role" = 'owner'
  ORDER BY m."created_at" ASC
  LIMIT 1
)
WHERE i."user_id" IS NULL;--> statement-breakpoint
UPDATE "integrations" i SET "user_id" = (
  SELECT m."user_id" FROM "workspace_members" m
  WHERE m."workspace_id" = i."workspace_id"
  ORDER BY m."created_at" ASC
  LIMIT 1
)
WHERE i."user_id" IS NULL;--> statement-breakpoint
DELETE FROM "integrations" i
WHERE i."user_id" IS NOT NULL
  AND i."id" NOT IN (
    SELECT DISTINCT ON ("user_id", "kind") "id"
    FROM "integrations"
    WHERE "user_id" IS NOT NULL
    ORDER BY "user_id", "kind", "updated_at" DESC NULLS LAST, "created_at" DESC
  );--> statement-breakpoint
UPDATE "conversations" c SET "user_id" = i."user_id"
FROM "integrations" i
WHERE c."integration_id" = i."id" AND c."user_id" IS NULL;--> statement-breakpoint
UPDATE "conversations" c SET "user_id" = (
  SELECT m."user_id" FROM "workspace_members" m
  WHERE m."workspace_id" = c."workspace_id" AND m."role" = 'owner'
  ORDER BY m."created_at" ASC
  LIMIT 1
)
WHERE c."user_id" IS NULL;--> statement-breakpoint
UPDATE "conversations" c SET "user_id" = (
  SELECT m."user_id" FROM "workspace_members" m
  WHERE m."workspace_id" = c."workspace_id"
  ORDER BY m."created_at" ASC
  LIMIT 1
)
WHERE c."user_id" IS NULL;--> statement-breakpoint
DELETE FROM "conversations" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "integrations" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_workspace_user_idx" ON "conversations" USING btree ("workspace_id","user_id");--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_kind_unique" UNIQUE("user_id","kind");--> statement-breakpoint
DROP POLICY "conversations_select_members" ON "conversations" CASCADE;--> statement-breakpoint
DROP POLICY "conversations_insert_roles" ON "conversations" CASCADE;--> statement-breakpoint
DROP POLICY "conversations_update_roles" ON "conversations" CASCADE;--> statement-breakpoint
DROP POLICY "conversations_delete_roles" ON "conversations" CASCADE;--> statement-breakpoint
DROP POLICY "integrations_select_members" ON "integrations" CASCADE;--> statement-breakpoint
DROP POLICY "integrations_insert_roles" ON "integrations" CASCADE;--> statement-breakpoint
DROP POLICY "integrations_update_roles" ON "integrations" CASCADE;--> statement-breakpoint
DROP POLICY "integrations_delete_roles" ON "integrations" CASCADE;--> statement-breakpoint
CREATE POLICY "conversations_select_owner" ON "conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("conversations"."user_id" = (select auth.uid()) and public.is_workspace_member("conversations"."workspace_id"));--> statement-breakpoint
CREATE POLICY "conversations_insert_owner" ON "conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("conversations"."user_id" = (select auth.uid()) and public.workspace_role("conversations"."workspace_id") in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "conversations_update_owner" ON "conversations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("conversations"."user_id" = (select auth.uid()) and public.workspace_role("conversations"."workspace_id") in ('owner', 'agent', 'assistant')) WITH CHECK ("conversations"."user_id" = (select auth.uid()) and public.workspace_role("conversations"."workspace_id") in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "conversations_delete_owner" ON "conversations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("conversations"."user_id" = (select auth.uid()) and public.workspace_role("conversations"."workspace_id") in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "integrations_select_owner" ON "integrations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("integrations"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "integrations_insert_owner" ON "integrations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("integrations"."user_id" = (select auth.uid()) and public.is_workspace_member("integrations"."workspace_id") and public.workspace_role("integrations"."workspace_id") in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "integrations_update_owner" ON "integrations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("integrations"."user_id" = (select auth.uid()) and public.workspace_role("integrations"."workspace_id") in ('owner', 'agent')) WITH CHECK ("integrations"."user_id" = (select auth.uid()) and public.workspace_role("integrations"."workspace_id") in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "integrations_delete_owner" ON "integrations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("integrations"."user_id" = (select auth.uid()) and public.workspace_role("integrations"."workspace_id") in ('owner', 'agent'));--> statement-breakpoint
ALTER POLICY "ai_drafts_select_members" ON "ai_drafts" TO authenticated USING ((select c.user_id from public.conversations c where c.id = "ai_drafts"."conversation_id") = (select auth.uid()) and public.is_workspace_member((select c.workspace_id from public.conversations c where c.id = "ai_drafts"."conversation_id")));--> statement-breakpoint
ALTER POLICY "ai_drafts_insert_roles" ON "ai_drafts" TO authenticated WITH CHECK ((select c.user_id from public.conversations c where c.id = "ai_drafts"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "ai_drafts"."conversation_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
ALTER POLICY "ai_drafts_update_roles" ON "ai_drafts" TO authenticated USING ((select c.user_id from public.conversations c where c.id = "ai_drafts"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "ai_drafts"."conversation_id")) in ('owner', 'agent', 'assistant')) WITH CHECK ((select c.user_id from public.conversations c where c.id = "ai_drafts"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "ai_drafts"."conversation_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
ALTER POLICY "ai_drafts_delete_roles" ON "ai_drafts" TO authenticated USING ((select c.user_id from public.conversations c where c.id = "ai_drafts"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "ai_drafts"."conversation_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
ALTER POLICY "messages_select_members" ON "messages" TO authenticated USING ((select c.user_id from public.conversations c where c.id = "messages"."conversation_id") = (select auth.uid()) and public.is_workspace_member((select c.workspace_id from public.conversations c where c.id = "messages"."conversation_id")));--> statement-breakpoint
ALTER POLICY "messages_insert_roles" ON "messages" TO authenticated WITH CHECK ((select c.user_id from public.conversations c where c.id = "messages"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "messages"."conversation_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
ALTER POLICY "messages_update_roles" ON "messages" TO authenticated USING ((select c.user_id from public.conversations c where c.id = "messages"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "messages"."conversation_id")) in ('owner', 'agent', 'assistant')) WITH CHECK ((select c.user_id from public.conversations c where c.id = "messages"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "messages"."conversation_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
ALTER POLICY "messages_delete_roles" ON "messages" TO authenticated USING ((select c.user_id from public.conversations c where c.id = "messages"."conversation_id") = (select auth.uid()) and public.workspace_role((select c.workspace_id from public.conversations c where c.id = "messages"."conversation_id")) in ('owner', 'agent', 'assistant'));