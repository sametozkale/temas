import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import {
  WRITE_ROLES_ALL,
  WRITE_ROLES_STAFF,
  hasAiThreadRole,
  isAiThreadMember,
  propertyChildPolicies,
  workspacePolicies,
} from "../rls";
import { authUsers, baseColumns } from "./_shared";
import { applications } from "./forms";
import { workspaces } from "./identity";
import { properties } from "./properties";

// docs/03 §7 — AI

export const aiThreads = pgTable(
  "ai_threads",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title"),
  },
  (t) => [...workspacePolicies("ai_threads", t.workspaceId)],
).enableRLS();

export const AI_MESSAGE_ROLES = ["user", "assistant", "tool"] as const;

export const aiMessages = pgTable(
  "ai_messages",
  {
    ...baseColumns,
    threadId: uuid("thread_id")
      .notNull()
      .references(() => aiThreads.id, { onDelete: "cascade" }),
    role: text("role", { enum: AI_MESSAGE_ROLES }).notNull(),
    content: text("content"),
    /** Credits this row spends. Ask user turns are 1. Assistant and tool rows are 0. */
    credits: integer("credits").notNull().default(0),
    toolCalls: jsonb("tool_calls").$type<unknown[]>(),
  },
  (t) => [
    check(
      "ai_messages_role_check",
      sql`${t.role} in ('user','assistant','tool')`,
    ),
    pgPolicy("ai_messages_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isAiThreadMember(t.threadId),
    }),
    pgPolicy("ai_messages_insert_roles", {
      for: "insert",
      to: authenticatedRole,
      withCheck: hasAiThreadRole(t.threadId, WRITE_ROLES_ALL),
    }),
    pgPolicy("ai_messages_update_roles", {
      for: "update",
      to: authenticatedRole,
      using: hasAiThreadRole(t.threadId, WRITE_ROLES_ALL),
      withCheck: hasAiThreadRole(t.threadId, WRITE_ROLES_ALL),
    }),
    pgPolicy("ai_messages_delete_roles", {
      for: "delete",
      to: authenticatedRole,
      using: hasAiThreadRole(t.threadId, WRITE_ROLES_ALL),
    }),
  ],
).enableRLS();

/** RAG corpus: property, document text, conversation summaries. text-embedding-3-small = 1536 dims. */
export const embeddings = pgTable(
  "embeddings",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    chunk: text("chunk").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index("embeddings_embedding_hnsw_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("embeddings_workspace_entity_idx").on(
      t.workspaceId,
      t.entity,
      t.entityId,
    ),
    ...workspacePolicies("embeddings", t.workspaceId),
  ],
).enableRLS();

export type ContractTemplateVariable = {
  key: string;
  label: string;
};

export const contractTemplates = pgTable(
  "contract_templates",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bodyMd: text("body_md").notNull(),
    variables: jsonb("variables")
      .$type<ContractTemplateVariable[]>()
      .notNull()
      .default([]),
  },
  (t) => [
    ...workspacePolicies(
      "contract_templates",
      t.workspaceId,
      WRITE_ROLES_STAFF,
    ),
  ],
).enableRLS();

export const CONTRACT_STATUSES = ["draft", "ready", "exported"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type ContractVersion = {
  savedAt: string;
  bodyMd: string;
};

export const contracts = pgTable(
  "contracts",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => contractTemplates.id, {
      onDelete: "set null",
    }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: CONTRACT_STATUSES })
      .notNull()
      .default("draft"),
    values: jsonb("values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    /** Current markdown draft (docs/05 §5 editor + versions). */
    bodyMd: text("body_md").notNull().default(""),
    versions: jsonb("versions")
      .$type<ContractVersion[]>()
      .notNull()
      .default([]),
    outputDocPath: text("output_doc_path"),
    outputPdfPath: text("output_pdf_path"),
    /** Export stays disabled (UI + server) until this is true. */
    disclaimerAcknowledged: boolean("disclaimer_acknowledged")
      .notNull()
      .default(false),
  },
  (t) => [
    check(
      "contracts_status_check",
      sql`${t.status} in ('draft','ready','exported')`,
    ),
    ...propertyChildPolicies("contracts", t.propertyId, {
      writeRoles: WRITE_ROLES_STAFF,
    }),
  ],
).enableRLS();

export const REMINDER_KINDS = [
  "viewing_followup",
  "booking_soon",
  "unanswered_message",
  "stale_applicant",
  "missing_deposit",
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const reminders = pgTable(
  "reminders",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    entity: text("entity"),
    entityId: uuid("entity_id"),
    kind: text("kind", { enum: REMINDER_KINDS }),
    message: text("message").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    source: text("source").notNull().default("ai"),
  },
  (t) => [...workspacePolicies("reminders", t.workspaceId)],
).enableRLS();
