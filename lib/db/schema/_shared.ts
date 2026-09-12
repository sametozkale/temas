import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Supabase-managed `auth.users`. Declared only so FKs can reference it;
 * `schemaFilter: ["public"]` in drizzle.config.ts keeps it out of migrations.
 */
export const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
});

/** Shared columns present on every table (docs/03 header). */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  ...timestamps,
};
