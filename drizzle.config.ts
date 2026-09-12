import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  // Only manage the public schema; `auth.users` is Supabase-owned and only referenced.
  schemaFilter: ["public"],
  // Roles (anon/authenticated/service_role) are managed by Supabase, not by us.
  entities: { roles: { provider: "supabase" } },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
