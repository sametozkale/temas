import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseSessionCookie } from "@/lib/supabase/session-cookie";

/** Don't let a stalled auth server hold the document with a blank tab. */
const AUTH_CHECK_TIMEOUT_MS = 4_000;

/**
 * Refreshes the Supabase session cookie and returns the current user.
 * Must be the only place that writes auth cookies in middleware.
 *
 * `getUser()` calls Auth only when a session cookie is present. Anonymous
 * requests (booking links, the marketing site) skip the client, the cookie
 * codec, and the auth lock. A signed-in check is capped so a stalled Auth
 * server cannot hold the document open with a blank tab.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
  if (!hasSupabaseSessionCookie(cookieNames)) {
    return { response, user: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), AUTH_CHECK_TIMEOUT_MS);
      }),
    ]);
    return { response, user: result?.data.user ?? null };
  } catch {
    return { response, user: null };
  }
}
