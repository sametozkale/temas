-- Public avatars bucket (docs/03 §9). Paths:
--   profiles/{userId}/{uuid}.ext     — the signed-in user
--   workspaces/{workspaceId}/{uuid}.ext — workspace owner
-- `profiles.avatar_url` and `workspaces.logo_url` store the object path.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

CREATE POLICY "havn_avatars_select_public" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');
--> statement-breakpoint

CREATE POLICY "havn_avatars_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (
      (storage.foldername(name))[1] = 'profiles'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'workspaces'
      AND public.workspace_role(((storage.foldername(name))[2])::uuid) = 'owner'
    )
  )
);
--> statement-breakpoint

CREATE POLICY "havn_avatars_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (
      (storage.foldername(name))[1] = 'profiles'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'workspaces'
      AND public.workspace_role(((storage.foldername(name))[2])::uuid) = 'owner'
    )
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (
      (storage.foldername(name))[1] = 'profiles'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'workspaces'
      AND public.workspace_role(((storage.foldername(name))[2])::uuid) = 'owner'
    )
  )
);
--> statement-breakpoint

CREATE POLICY "havn_avatars_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (
      (storage.foldername(name))[1] = 'profiles'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    OR (
      (storage.foldername(name))[1] = 'workspaces'
      AND public.workspace_role(((storage.foldername(name))[2])::uuid) = 'owner'
    )
  )
);
