import { headers } from "next/headers";

import { env } from "@/lib/env";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function isLoopbackHost(hostOrUrl: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(hostOrUrl);
}

export function configuredAppUrl() {
  return stripSlash(env().APP_URL);
}

/**
 * Origin for links in emails and OAuth. On Vercel / production, a loopback
 * host is never used — magic-link redirects would otherwise land on localhost.
 */
export async function publicAppUrl(): Promise<string> {
  const fallback = configuredAppUrl();
  const preferPublic =
    Boolean(process.env.VERCEL) || env().NODE_ENV === "production";

  let fromRequest: string | undefined;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ?? (isLoopbackHost(host) ? "http" : "https");
      fromRequest = `${proto}://${host}`;
    }
  } catch {
    // Called outside a request (Inngest, build).
  }

  const candidate = fromRequest ?? fallback;
  if (preferPublic && isLoopbackHost(candidate)) {
    if (!isLoopbackHost(fallback)) return fallback;
    throw new Error("APP_URL must be the public origin in production");
  }
  return stripSlash(candidate);
}

export function appPath(path: string, origin: string) {
  return new URL(path, `${origin}/`).toString();
}

/** Prefer a non-loopback redirect; otherwise the configured public origin. */
export function publicOriginFromRedirect(redirectTo: string | undefined) {
  const fallback = configuredAppUrl();
  if (!redirectTo) return fallback;
  try {
    const url = new URL(redirectTo);
    if (isLoopbackHost(url.host) && !isLoopbackHost(fallback)) return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}
