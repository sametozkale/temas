import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rateLimitBuckets } from "@/lib/db/schema";

/**
 * Increment a named bucket and return whether the caller is still under `limit`
 * for this window. Used for public OTP / booking caps (docs/04 §4).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; count: number }> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.key, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });
  const count = row?.count ?? limit + 1;
  return { ok: count <= limit, count };
}
