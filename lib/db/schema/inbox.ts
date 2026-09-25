import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  conversationChildPolicies,
  conversationOwnerPolicies,
  mailboxOwnerPolicies,
} from "../rls";
import { authUsers, baseColumns } from "./_shared";
import { contacts } from "./contacts";
import { workspaces } from "./identity";
import { properties } from "./properties";

// docs/03 §6 — Inbox

export const INTEGRATION_KINDS = ["gmail", "outlook", "whatsapp"] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export const integrations = pgTable(
  "integrations",
  {
    ...baseColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    /** Home workspace (connected-from); unmatched inbound fallback. */
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: INTEGRATION_KINDS }).notNull(),
    status: text("status").notNull().default("connected"),
    /** Encrypted at rest (pgsodium/vault); readable by service role only. */
    credentials: jsonb("credentials").$type<Record<string, unknown>>(),
    externalId: text("external_id"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (t) => [
    unique("integrations_user_kind_unique").on(t.userId, t.kind),
    check(
      "integrations_kind_check",
      sql`${t.kind} in ('gmail','outlook','whatsapp')`,
    ),
    ...mailboxOwnerPolicies("integrations", t.userId, t.workspaceId),
  ],
).enableRLS();

export const CHANNELS = ["email", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export const MAILBOX_STATES = ["inbox", "archived", "trash", "spam"] as const;
export type MailboxState = (typeof MAILBOX_STATES)[number];

export const conversations = pgTable(
  "conversations",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id").references(() => integrations.id, {
      onDelete: "set null",
    }),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    /** Auto-matched by phone/email. */
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    subject: text("subject"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    aiSummary: text("ai_summary"),
    isRead: boolean("is_read").notNull().default(false),
    /** Where this thread sits in the mailbox. Inbox list shows `inbox` only. */
    mailboxState: text("mailbox_state", { enum: MAILBOX_STATES })
      .notNull()
      .default("inbox"),
    starred: boolean("starred").notNull().default(false),
  },
  (t) => [
    check(
      "conversations_channel_check",
      sql`${t.channel} in ('email','whatsapp')`,
    ),
    check(
      "conversations_mailbox_state_check",
      sql`${t.mailboxState} in ('inbox','archived','trash','spam')`,
    ),
    index("conversations_workspace_user_idx").on(t.workspaceId, t.userId),
    ...conversationOwnerPolicies("conversations", t.userId, t.workspaceId),
  ],
).enableRLS();

export const MESSAGE_DIRECTIONS = ["in", "out"] as const;

export const messages = pgTable(
  "messages",
  {
    ...baseColumns,
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: MESSAGE_DIRECTIONS }).notNull(),
    body: text("body"),
    bodyHtml: text("body_html"),
    externalId: text("external_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    check("messages_direction_check", sql`${t.direction} in ('in','out')`),
    unique("messages_conversation_external_unique").on(
      t.conversationId,
      t.externalId,
    ),
    ...conversationChildPolicies("messages", t.conversationId),
  ],
).enableRLS();

export const aiDrafts = pgTable(
  "ai_drafts",
  {
    ...baseColumns,
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    tone: text("tone"),
    status: text("status").notNull().default("pending"),
    model: text("model"),
    /** 0–100 similarity vs the sent body (docs/05 §3). */
    acceptancePct: integer("acceptance_pct"),
  },
  (t) => [...conversationChildPolicies("ai_drafts", t.conversationId)],
).enableRLS();
