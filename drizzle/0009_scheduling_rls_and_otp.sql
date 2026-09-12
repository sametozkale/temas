CREATE TABLE "email_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purpose" text DEFAULT 'booking' NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" text
);
--> statement-breakpoint
ALTER TABLE "email_otps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "availability_exceptions_select_members" ON "availability_exceptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_workspace_member(public.property_workspace(public.calendar_property(public.window_calendar("availability_exceptions"."availability_window_id")))));--> statement-breakpoint
CREATE POLICY "availability_exceptions_insert_roles" ON "availability_exceptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role(public.property_workspace(public.calendar_property(public.window_calendar("availability_exceptions"."availability_window_id")))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "availability_exceptions_update_roles" ON "availability_exceptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role(public.property_workspace(public.calendar_property(public.window_calendar("availability_exceptions"."availability_window_id")))) in ('owner', 'agent', 'assistant')) WITH CHECK (public.workspace_role(public.property_workspace(public.calendar_property(public.window_calendar("availability_exceptions"."availability_window_id")))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "availability_exceptions_delete_roles" ON "availability_exceptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role(public.property_workspace(public.calendar_property(public.window_calendar("availability_exceptions"."availability_window_id")))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "availability_windows_select_members" ON "availability_windows" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_workspace_member(public.property_workspace(public.calendar_property("availability_windows"."viewing_calendar_id"))) or public.is_property_person(public.calendar_property("availability_windows"."viewing_calendar_id"))));--> statement-breakpoint
CREATE POLICY "availability_windows_insert_roles" ON "availability_windows" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role(public.property_workspace(public.calendar_property("availability_windows"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "availability_windows_update_roles" ON "availability_windows" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role(public.property_workspace(public.calendar_property("availability_windows"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant')) WITH CHECK (public.workspace_role(public.property_workspace(public.calendar_property("availability_windows"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "availability_windows_delete_roles" ON "availability_windows" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role(public.property_workspace(public.calendar_property("availability_windows"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "bookings_select_members" ON "bookings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_workspace_member(public.property_workspace("bookings"."property_id")) or (public.is_property_person("bookings"."property_id") and exists (
        select 1 from "contacts" c where c.id = "bookings"."contact_id" and c.user_id = (select auth.uid())
      ))));--> statement-breakpoint
CREATE POLICY "bookings_insert_roles" ON "bookings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role(public.property_workspace("bookings"."property_id")) in ('owner','agent','assistant'));--> statement-breakpoint
CREATE POLICY "bookings_update_roles" ON "bookings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role(public.property_workspace("bookings"."property_id")) in ('owner','agent','assistant')) WITH CHECK (public.workspace_role(public.property_workspace("bookings"."property_id")) in ('owner','agent','assistant'));--> statement-breakpoint
CREATE POLICY "viewing_calendars_select_members" ON "viewing_calendars" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_workspace_member(public.property_workspace("viewing_calendars"."property_id")) or public.is_property_person("viewing_calendars"."property_id")));--> statement-breakpoint
CREATE POLICY "viewing_calendars_insert_roles" ON "viewing_calendars" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role(public.property_workspace("viewing_calendars"."property_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "viewing_calendars_update_roles" ON "viewing_calendars" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role(public.property_workspace("viewing_calendars"."property_id")) in ('owner', 'agent', 'assistant')) WITH CHECK (public.workspace_role(public.property_workspace("viewing_calendars"."property_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "viewing_calendars_delete_roles" ON "viewing_calendars" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role(public.property_workspace("viewing_calendars"."property_id")) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "viewing_slots_select_members" ON "viewing_slots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_workspace_member(public.property_workspace(public.calendar_property("viewing_slots"."viewing_calendar_id"))) or public.is_property_person(public.calendar_property("viewing_slots"."viewing_calendar_id"))));--> statement-breakpoint
CREATE POLICY "viewing_slots_insert_roles" ON "viewing_slots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.workspace_role(public.property_workspace(public.calendar_property("viewing_slots"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "viewing_slots_update_roles" ON "viewing_slots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.workspace_role(public.property_workspace(public.calendar_property("viewing_slots"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant')) WITH CHECK (public.workspace_role(public.property_workspace(public.calendar_property("viewing_slots"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant'));--> statement-breakpoint
CREATE POLICY "viewing_slots_delete_roles" ON "viewing_slots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.workspace_role(public.property_workspace(public.calendar_property("viewing_slots"."viewing_calendar_id"))) in ('owner', 'agent', 'assistant'));