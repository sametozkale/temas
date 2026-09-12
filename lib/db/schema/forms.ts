import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { baseColumns } from "./_shared";
import { contacts } from "./contacts";
import { properties } from "./properties";

// docs/03 §5 — Forms & Pipeline

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "multiselect"
  | "boolean"
  | "file";

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  helpText?: string;
};

export const forms = pgTable("forms", {
  ...baseColumns,
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** Field definitions: [{key,label,type,required,options}] */
  schema: jsonb("schema").$type<FormField[]>().notNull(),
  publicToken: text("public_token").unique(),
  isPublished: boolean("is_published").notNull().default(false),
}).enableRLS();

export const formSubmissions = pgTable("form_submissions", {
  ...baseColumns,
  formId: uuid("form_id")
    .notNull()
    .references(() => forms.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
  attachments: jsonb("attachments")
    .$type<{ key: string; storagePath: string; name: string }[]>()
    .notNull()
    .default([]),
  status: text("status").notNull().default("received"),
}).enableRLS();

export const pipelineStages = pgTable("pipeline_stages", {
  ...baseColumns,
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  /** Token name (e.g. "info", "success"), never a hex literal. */
  color: text("color"),
  isTerminal: boolean("is_terminal").notNull().default(false),
}).enableRLS();

export const applications = pgTable("applications", {
  ...baseColumns,
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").references(() => formSubmissions.id, {
    onDelete: "set null",
  }),
  stageId: uuid("stage_id").references(() => pipelineStages.id, {
    onDelete: "set null",
  }),
  score: integer("score"),
  aiSummary: text("ai_summary"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
}).enableRLS();

/** Read-only owner presentation link. */
export const ownerViews = pgTable("owner_views", {
  ...baseColumns,
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  publicToken: text("public_token").notNull().unique(),
  showStages: uuid("show_stages").array(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}).enableRLS();
