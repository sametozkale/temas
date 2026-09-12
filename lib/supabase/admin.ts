import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/** Service-role client for public form uploads (bypasses storage RLS). */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(env().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
