/**
 * Default GoTrue storage key (`@supabase/auth-js` STORAGE_KEY).
 * This app does not set `cookieOptions.name`, so session cookies use it.
 * Chunked cookies are `supabase.auth.token.0`, `.1`, … PKCE verifiers
 * (`…-code-verifier`) are not a session.
 */
export const SUPABASE_SESSION_COOKIE = "supabase.auth.token";

const CHUNK_SUFFIX = /^\.(0|[1-9][0-9]*)$/;

export function hasSupabaseSessionCookie(names: readonly string[]): boolean {
  return names.some((name) => {
    if (name === SUPABASE_SESSION_COOKIE) return true;
    if (!name.startsWith(`${SUPABASE_SESSION_COOKIE}.`)) return false;
    return CHUNK_SUFFIX.test(name.slice(SUPABASE_SESSION_COOKIE.length));
  });
}
