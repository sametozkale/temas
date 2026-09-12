import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import { authUsers, baseColumns } from "./_shared";
import { applications } from "./forms";
import { workspaces } from "./identity";
import { properties } from "./properties";

// docs/03 §7 — AI

export const aiThreads = pgTable("ai_threads", {
  ...baseColumns,
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  title: text("title"),
}).enableRLS();

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
    toolCalls: jsonb("tool_calls").$type<unknown[]>(),
  },
  (t) => [
    check(
      "ai_messages_role_check",
      sql`${t.role} in ('user','assistant','tool')`,
    ),
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
  ],
).enableRLS();

export const contractTemplates = pgTable("contract_templates", {
  ...baseColumns,
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bodyMd: text("body_md").notNull(),
  variables: jsonb("variables").$type<Record<string, unknown>>(),
}).enableRLS();

export const contracts = pgTable("contracts", {
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
  status: text("status").notNull().default("draft"),
  values: jsonb("values").$type<Record<string, unknown>>(),
  outputDocPath: text("output_doc_path"),
  outputPdfPath: text("output_pdf_path"),
  /** Export stays disabled (UI + server) until this is true. */
  disclaimerAcknowledged: boolean("disclaimer_acknowledged")
    .notNull()
    .default(false),
}).enableRLS();

export const reminders = pgTable("reminders", {
  ...baseColumns,
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => authUsers.id, {
    onDelete: "cascade",
  }),
  entity: text("entity"),
  entityId: uuid("entity_id"),
  kind: text("kind"),
  message: text("message").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  source: text("source").notNull().default("ai"),
}).enableRLS();
