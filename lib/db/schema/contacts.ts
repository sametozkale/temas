import { boolean, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { authUsers, baseColumns } from "./_shared";
import { workspaces } from "./identity";

// docs/03 §2 — Contacts (all people in one table; auth account optional)

export const contacts = pgTable(
  "contacts",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Null until the person is invited / links an account. */
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    emailVerified: boolean("email_verified").notNull().default(false),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    notes: text("notes"),
  },
  (t) => [
    unique("contacts_workspace_email_unique").on(t.workspaceId, t.email),
    unique("contacts_workspace_phone_unique").on(t.workspaceId, t.phone),
  ],
).enableRLS();
