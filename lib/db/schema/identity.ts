import { sql } from "drizzle-orm";
import {
  check,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  INVITE_ROLES,
  WORKSPACE_ROLES,
  type InviteRole,
  type WorkspaceRole,
} from "@/lib/roles";

import {
  WRITE_ROLES_OWNER,
  WRITE_ROLES_STAFF,
  authUid,
  authenticatedRole,
  isMember,
  workspacePolicies,
} from "../rls";
import { authUsers, baseColumns, timestamps } from "./_shared";

// docs/03 §1 — Identity & Workspace

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    locale: text("locale").notNull().default("tr"),
    ...timestamps,
  },
  (t) => [
    // Own row, plus co-members of any shared workspace (Members list).
    pgPolicy("profiles_select_self_or_comember", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.id} = ${authUid} or public.shares_workspace_with(${t.id})`,
    }),
    pgPolicy("profiles_update_self", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.id} = ${authUid}`,
      withCheck: sql`${t.id} = ${authUid}`,
    }),
  ],
).enableRLS();

export const workspaces = pgTable(
  "workspaces",
  {
    ...baseColumns,
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    timezone: text("timezone").notNull().default("Europe/Istanbul"),
    plan: text("plan").notNull().default("free"),
  },
  (t) => [
    pgPolicy("workspaces_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isMember(t.id),
    }),
    pgPolicy("workspaces_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`public.workspace_role(${t.id}) = 'owner'`,
      withCheck: sql`public.workspace_role(${t.id}) = 'owner'`,
    }),
    pgPolicy("workspaces_delete_owner", {
      for: "delete",
      to: authenticatedRole,
      using: sql`public.workspace_role(${t.id}) = 'owner'`,
    }),
    // Creation (onboarding) runs in system context; no INSERT policy for users.
  ],
).enableRLS();

export { INVITE_ROLES, WORKSPACE_ROLES };
export type { InviteRole, WorkspaceRole };

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
    pgPolicy("workspace_members_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isMember(t.workspaceId),
    }),
    // Role changes / removals: owner only. Inserts happen via invite acceptance (system context).
    pgPolicy("workspace_members_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`public.workspace_role(${t.workspaceId}) in ('owner')`,
      withCheck: sql`public.workspace_role(${t.workspaceId}) in ('owner')`,
    }),
    pgPolicy("workspace_members_delete_owner_or_self", {
      for: "delete",
      to: authenticatedRole,
      using: sql`public.workspace_role(${t.workspaceId}) in ('owner') or ${t.userId} = ${authUid}`,
    }),
  ],
).enableRLS();

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
  (t) => [
    check("invites_role_check", sql`${t.role} in ('agent','assistant')`),
    ...workspacePolicies("invites", t.workspaceId, WRITE_ROLES_STAFF),
  ],
).enableRLS();

// Re-exported for callers that only need the constants.
export { WRITE_ROLES_OWNER };
