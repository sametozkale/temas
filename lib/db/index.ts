import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Server-only Drizzle client. Import from Server Components, Server Actions,
 * route handlers and Inngest functions — never from client components.
 */
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // prepare:false keeps the client compatible with Supabase's transaction pooler.
  const sql = postgres(url, { prepare: false });
  return drizzle(sql, { schema });
}

const globalForDb = globalThis as unknown as {
  __havnDb?: ReturnType<typeof createClient>;
};

export const db = globalForDb.__havnDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__havnDb = db;
}

export type Db = typeof db;
export { schema };
