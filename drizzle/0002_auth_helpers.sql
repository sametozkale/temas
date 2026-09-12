-- Auth / RLS helper functions (docs/03 §8, docs/02 §3).
-- SECURITY DEFINER so that policies on workspace_members itself do not recurse.

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = ws
      AND m.user_id = auth.uid()
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.workspace_role(ws uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.workspace_members m
  WHERE m.workspace_id = ws
    AND m.user_id = auth.uid()
  LIMIT 1;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.shares_workspace_with(other uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members a
    JOIN public.workspace_members b ON a.workspace_id = b.workspace_id
    WHERE a.user_id = auth.uid()
      AND b.user_id = other
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM public;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.workspace_role(uuid) FROM public;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.shares_workspace_with(uuid) FROM public;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid) TO authenticated, service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.shares_workspace_with(uuid) TO authenticated, service_role;
--> statement-breakpoint

-- Create a profile row for every new auth user (docs/03 §1 profiles).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'tr')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
