-- Property RLS helpers (docs/03 §8) + private storage buckets (docs/00 §3.1 Files, docs/02 stack).

-- Workspace of a property; used by policies on child tables that only carry property_id.
CREATE OR REPLACE FUNCTION public.property_workspace(pid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.workspace_id
  FROM public.properties p
  WHERE p.id = pid
  LIMIT 1;
$$;
--> statement-breakpoint

-- True when the caller is linked to the property as owner / current_tenant through
-- property_people -> contacts.user_id (restricted SELECT for external people).
CREATE OR REPLACE FUNCTION public.is_property_person(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_people pp
    JOIN public.contacts c ON c.id = pp.contact_id
    WHERE pp.property_id = pid
      AND pp.joined_at IS NOT NULL
      AND c.user_id = auth.uid()
  );
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.property_workspace(uuid) TO authenticated, service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_property_person(uuid) TO authenticated, service_role;
--> statement-breakpoint

-- Private buckets. Object paths are "<workspace_id>/<property_id>/<uuid>.<ext>".
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('property-media', 'property-media', false, 26214400,
   ARRAY['image/jpeg','image/png','image/webp','image/heic','video/mp4','application/pdf']),
  ('documents', 'documents', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- Storage RLS: workspace members may read/write objects under their workspace folder.
CREATE POLICY "havn_objects_select_members" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN ('property-media', 'documents')
  AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
--> statement-breakpoint
CREATE POLICY "havn_objects_insert_members" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('property-media', 'documents')
  AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
--> statement-breakpoint
CREATE POLICY "havn_objects_update_members" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('property-media', 'documents')
  AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
--> statement-breakpoint
CREATE POLICY "havn_objects_delete_members" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('property-media', 'documents')
  AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
