import { headers } from "next/headers";

/** Best-effort client IP for rate-limit buckets (proxies first). */
export function clientIpFromHeaders(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

export async function clientIp(): Promise<string> {
  return clientIpFromHeaders(await headers());
}
