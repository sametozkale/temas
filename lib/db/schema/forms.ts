import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { formChildPolicies, propertyChildPolicies } from "../rls";
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
  /** When true, the question stays on the form but applicants do not see it. */
  hidden?: boolean;
};

export const forms = pgTable(
  "forms",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Field definitions: [{key,label,type,required,options,hidden}] */
    schema: jsonb("schema").$type<FormField[]>().notNull(),
    publicToken: text("public_token").unique(),
    isPublished: boolean("is_published").notNull().default(false),
  },
  (t) => [...propertyChildPolicies("forms", t.propertyId)],
).enableRLS();

export const formSubmissions = pgTable(
  "form_submissions",
  {
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
  },
  (t) => [
    unique("form_submissions_form_contact_unique").on(t.formId, t.contactId),
    ...formChildPolicies("form_submissions", t.formId),
  ],
).enableRLS();

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    /** Token name (e.g. "info", "success"), never a hex literal. */
    color: text("color"),
    isTerminal: boolean("is_terminal").notNull().default(false),
  },
  (t) => [...propertyChildPolicies("pipeline_stages", t.propertyId)],
).enableRLS();

export const applications = pgTable(
  "applications",
  {
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
  },
  (t) => [
    unique("applications_property_contact_unique").on(
      t.propertyId,
      t.contactId,
    ),
    ...propertyChildPolicies("applications", t.propertyId),
  ],
).enableRLS();

/** Read-only owner presentation link. */
export const ownerViews = pgTable(
  "owner_views",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    publicToken: text("public_token").notNull().unique(),
    showStages: uuid("show_stages").array(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [...propertyChildPolicies("owner_views", t.propertyId)],
).enableRLS();
