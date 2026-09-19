import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  WRITE_ROLES_ALL,
  authUid,
  authenticatedRole,
  hasRole,
  isMember,
} from "../rls";
import { authUsers, baseColumns } from "./_shared";
import { conversations } from "./inbox";
import { workspaces } from "./identity";
import { properties } from "./properties";

// docs/03 §6.1 — Tasks

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "suggested",
  "open",
  "done",
  "dismissed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_SOURCES = ["manual", "ai"] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const tasks = pgTable(
  "tasks",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority", { enum: TASK_PRIORITIES })
      .notNull()
      .default("medium"),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("open"),
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    source: text("source", { enum: TASK_SOURCES }).notNull().default("manual"),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    fingerprint: text("fingerprint"),
    /** Mailbox owner; set only while status is suggested or dismissed. */
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
  },
  (t) => [
    check(
      "tasks_priority_check",
      sql`${t.priority} in ('low','medium','high')`,
    ),
    check(
      "tasks_status_check",
      sql`${t.status} in ('suggested','open','done','dismissed')`,
    ),
    check("tasks_source_check", sql`${t.source} in ('manual','ai')`),
    uniqueIndex("tasks_conversation_fingerprint_unique")
      .on(t.conversationId, t.fingerprint)
      .where(sql`${t.conversationId} is not null`),
    index("tasks_workspace_status_idx").on(t.workspaceId, t.status),
    index("tasks_workspace_property_idx").on(t.workspaceId, t.propertyId),
    pgPolicy("tasks_select_members", {
      for: "select",
      to: authenticatedRole,
      using: sql`(${isMember(t.workspaceId)} and (${t.status} in ('open','done') or ${t.userId} = ${authUid}))`,
    }),
    pgPolicy("tasks_insert_roles", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(${hasRole(t.workspaceId, WRITE_ROLES_ALL)} and ((${t.status} in ('open','done') and ${t.userId} is null) or (${t.status} in ('suggested','dismissed') and ${t.userId} = ${authUid})))`,
    }),
    pgPolicy("tasks_update_roles", {
      for: "update",
      to: authenticatedRole,
      using: sql`(${hasRole(t.workspaceId, WRITE_ROLES_ALL)} and (${t.status} in ('open','done') or ${t.userId} = ${authUid}))`,
      withCheck: sql`(${hasRole(t.workspaceId, WRITE_ROLES_ALL)} and ((${t.status} in ('open','done') and ${t.userId} is null) or (${t.status} in ('suggested','dismissed') and ${t.userId} = ${authUid})))`,
    }),
    pgPolicy("tasks_delete_roles", {
      for: "delete",
      to: authenticatedRole,
      using: sql`(${hasRole(t.workspaceId, WRITE_ROLES_ALL)} and (${t.status} in ('open','done') or ${t.userId} = ${authUid}))`,
    }),
  ],
).enableRLS();
