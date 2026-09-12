ALTER TABLE "contract_templates" ALTER COLUMN "variables" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "contract_templates" ALTER COLUMN "variables" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "values" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "values" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reminder_digest_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "body_md" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "versions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_status_check" CHECK ("contracts"."status" in ('draft','ready','exported'));--> statement-breakpoint
CREATE POLICY "contract_templates_select_members" ON "contract_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_workspace_member("contract_templates"."workspace_id"));--> statement-breakpoint
CREATE POLICY "contract_templates_insert_roles" ON "contract_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role("contract_templates"."workspace_id") in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "contract_templates_update_roles" ON "contract_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role("contract_templates"."workspace_id") in ('owner', 'agent')) WITH CHECK (public.workspace_role("contract_templates"."workspace_id") in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "contract_templates_delete_roles" ON "contract_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role("contract_templates"."workspace_id") in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "contracts_select_members" ON "contracts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_workspace_member(public.property_workspace("contracts"."property_id")));--> statement-breakpoint
CREATE POLICY "contracts_insert_roles" ON "contracts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role(public.property_workspace("contracts"."property_id")) in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "contracts_update_roles" ON "contracts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role(public.property_workspace("contracts"."property_id")) in ('owner', 'agent')) WITH CHECK (public.workspace_role(public.property_workspace("contracts"."property_id")) in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "contracts_delete_roles" ON "contracts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role(public.property_workspace("contracts"."property_id")) in ('owner', 'agent'));--> statement-breakpoint
CREATE POLICY "reminders_select_members" ON "reminders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_workspace_member("reminders"."workspace_id"));--> statement-breakpoint
CREATE POLICY "reminders_insert_roles" ON "reminders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role("reminders"."workspace_id") in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "reminders_update_roles" ON "reminders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role("reminders"."workspace_id") in ('owner', 'agent', 'assistant')) WITH CHECK (public.workspace_role("reminders"."workspace_id") in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "reminders_delete_roles" ON "reminders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role("reminders"."workspace_id") in ('owner', 'agent', 'assistant'));