import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/action-result";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that require a signed-in user (the `(app)` group + onboarding). */
const PROTECTED_PREFIXES = [
  "/home",
  "/inbox",
  "/calendar",
  "/tasks",
  "/properties",
  "/pipeline",
  "/settings",
  "/onboarding",
];

/** Signed-in users are bounced away from these. */
const AUTH_ONLY_PREFIXES = ["/login"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && matches(pathname, AUTH_ONLY_PREFIXES)) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const url = request.nextUrl.clone();
    url.pathname = matches(next, AUTH_ONLY_PREFIXES) ? "/home" : next;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, images and the Inngest/webhook endpoints.
    "/((?!_next/static|_next/image|favicon.ico|api/inngest|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
