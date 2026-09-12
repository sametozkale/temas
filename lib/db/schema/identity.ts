import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers, baseColumns, timestamps } from "./_shared";

// docs/03 §1 — Identity & Workspace

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").notNull().default("tr"),
  ...timestamps,
}).enableRLS();

export const workspaces = pgTable("workspaces", {
  ...baseColumns,
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  timezone: text("timezone").notNull().default("Europe/Istanbul"),
  plan: text("plan").notNull().default("free"),
}).enableRLS();

export const WORKSPACE_ROLES = ["owner", "agent", "assistant"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: WORKSPACE_ROLES }).notNull(),
  },
  (t) => [
    unique("workspace_members_workspace_user_unique").on(
      t.workspaceId,
      t.userId,
    ),
    check(
      "workspace_members_role_check",
      sql`${t.role} in ('owner','agent','assistant')`,
    ),
  ],
).enableRLS();

export const INVITE_ROLES = ["agent", "assistant"] as const;

export const invites = pgTable(
  "invites",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: INVITE_ROLES }).notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => [check("invites_role_check", sql`${t.role} in ('agent','assistant')`)],
).enableRLS();
