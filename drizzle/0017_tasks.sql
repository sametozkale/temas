CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"property_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assignee_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"conversation_id" uuid,
	"fingerprint" text,
	"user_id" uuid,
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" in ('low','medium','high')),
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('suggested','open','done','dismissed')),
	CONSTRAINT "tasks_source_check" CHECK ("tasks"."source" in ('manual','ai'))
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_conversation_fingerprint_unique" ON "tasks" USING btree ("conversation_id","fingerprint") WHERE "tasks"."conversation_id" is not null;--> statement-breakpoint
CREATE INDEX "tasks_workspace_status_idx" ON "tasks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "tasks_workspace_property_idx" ON "tasks" USING btree ("workspace_id","property_id");--> statement-breakpoint
CREATE POLICY "tasks_select_members" ON "tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_workspace_member("tasks"."workspace_id") and ("tasks"."status" in ('open','done') or "tasks"."user_id" = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "tasks_insert_roles" ON "tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((public.workspace_role("tasks"."workspace_id") in ('owner', 'agent', 'assistant') and (("tasks"."status" in ('open','done') and "tasks"."user_id" is null) or ("tasks"."status" in ('suggested','dismissed') and "tasks"."user_id" = (select auth.uid())))));--> statement-breakpoint
CREATE POLICY "tasks_update_roles" ON "tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((public.workspace_role("tasks"."workspace_id") in ('owner', 'agent', 'assistant') and ("tasks"."status" in ('open','done') or "tasks"."user_id" = (select auth.uid())))) WITH CHECK ((public.workspace_role("tasks"."workspace_id") in ('owner', 'agent', 'assistant') and (("tasks"."status" in ('open','done') and "tasks"."user_id" is null) or ("tasks"."status" in ('suggested','dismissed') and "tasks"."user_id" = (select auth.uid())))));--> statement-breakpoint
CREATE POLICY "tasks_delete_roles" ON "tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((public.workspace_role("tasks"."workspace_id") in ('owner', 'agent', 'assistant') and ("tasks"."status" in ('open','done') or "tasks"."user_id" = (select auth.uid()))));