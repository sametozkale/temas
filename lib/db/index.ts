import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Server-only Drizzle client. Import from Server Components, Server Actions,
 * route handlers and Inngest functions — never from client components.
 *
 * Two access modes (docs/02 §3 defense-in-depth):
 *  - `db`               — system context (bypasses RLS). Bootstrap flows,
 *                          webhooks, Inngest jobs. Always guard with requireAbility().
 *  - `withUserContext`  — runs a transaction as the `authenticated` role with
 *                          the user's JWT claims, so Postgres RLS policies apply
 *                          to application queries too.
 */
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // prepare:false keeps the client compatible with Supabase's transaction pooler.
  const client = postgres(url, { prepare: false });
  return drizzle(client, {
    schema,
    logger: process.env.DRIZZLE_LOG === "1",
  });
}

const globalForDb = globalThis as unknown as {
  __temasDb?: ReturnType<typeof createClient>;
};

export const db = globalForDb.__temasDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__temasDb = db;
}

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

/**
 * Execute `fn` inside a transaction that Postgres evaluates as the given user.
 * `auth.uid()` resolves to `userId`, so every RLS policy is enforced.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${claims}, true)`,
    );
    await tx.execute(
      sql`select set_config('request.jwt.claim.sub', ${userId}, true)`,
    );
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}

export { schema };
