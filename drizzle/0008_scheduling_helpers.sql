-- Viewing-calendar RLS helpers (docs/03 §4 / §8) + public-token accessors (docs/04 §4).

CREATE OR REPLACE FUNCTION public.calendar_property(cid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vc.property_id
  FROM public.viewing_calendars vc
  WHERE vc.id = cid
  LIMIT 1;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.window_calendar(wid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.viewing_calendar_id
  FROM public.availability_windows w
  WHERE w.id = wid
  LIMIT 1;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.calendar_property(uuid) TO authenticated, service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.window_calendar(uuid) TO authenticated, service_role;
