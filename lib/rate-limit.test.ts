import { like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb("consumeRateLimit", () => {
  let consumeRateLimit: typeof import("./rate-limit").consumeRateLimit;
  let db: typeof import("./db").db;
  let schema: typeof import("./db/schema");
  const prefix = `test:rl:${Date.now()}`;

  beforeAll(async () => {
    ({ consumeRateLimit } = await import("./rate-limit"));
    ({ db } = await import("./db"));
    schema = await import("./db/schema");
  });

  afterAll(async () => {
    await db
      .delete(schema.rateLimitBuckets)
      .where(like(schema.rateLimitBuckets.key, `${prefix}%`));
  });

  it("allows requests under the limit and blocks after", async () => {
    const key = `${prefix}:ok`;
    const first = await consumeRateLimit(key, 2, 60_000);
    const second = await consumeRateLimit(key, 2, 60_000);
    const third = await consumeRateLimit(key, 2, 60_000);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.count).toBeGreaterThan(2);
  });
});
