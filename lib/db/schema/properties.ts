import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { authUid, authenticatedRole, isMember } from "../rls";
import { authUsers, baseColumns } from "./_shared";
import { contacts } from "./contacts";
import { workspaces } from "./identity";

// docs/03 §3 — Properties

export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "office",
  "shop",
  "warehouse",
  "land",
  "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** Lifecycle (docs/00 §8). */
export const PROPERTY_STATUSES = [
  "draft",
  "active",
  "viewing_in_progress",
  "application_review",
  "contract_pending",
  "rented",
  "archived",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export type PropertyAddress = {
  line?: string;
  district?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
};

export const properties = pgTable(
  "properties",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type", { enum: PROPERTY_TYPES }).notNull(),
    title: text("title").notNull(),
    status: text("status", { enum: PROPERTY_STATUSES })
      .notNull()
      .default("draft"),
    address: jsonb("address").$type<PropertyAddress>(),
    timezone: text("timezone").notNull().default("Europe/Istanbul"),
    rentAmount: numeric("rent_amount"),
    currency: text("currency").notNull().default("TRY"),
    depositAmount: numeric("deposit_amount"),
    areaM2: numeric("area_m2"),
    rooms: text("rooms"),
    floor: integer("floor"),
    features: jsonb("features")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    description: text("description"),
    /** Points at property_media.id; no FK to avoid a cyclic dependency. */
    coverMediaId: uuid("cover_media_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "properties_type_check",
      sql`${t.type} in ('apartment','house','office','shop','warehouse','land','other')`,
    ),
    check(
      "properties_status_check",
      sql`${t.status} in ('draft','active','viewing_in_progress','application_review','contract_pending','rented','archived')`,
    ),
  ],
).enableRLS();

export const MEDIA_KINDS = ["photo", "video", "plan"] as const;

export const propertyMedia = pgTable(
  "property_media",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    kind: text("kind", { enum: MEDIA_KINDS }).notNull().default("photo"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    check(
      "property_media_kind_check",
      sql`${t.kind} in ('photo','video','plan')`,
    ),
  ],
).enableRLS();

export const INVENTORY_CONDITIONS = ["new", "good", "fair", "poor"] as const;

export const inventoryItems = pgTable(
  "inventory_items",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    condition: text("condition", { enum: INVENTORY_CONDITIONS }),
    note: text("note"),
    photoPath: text("photo_path"),
  },
  (t) => [
    check(
      "inventory_items_condition_check",
      sql`${t.condition} in ('new','good','fair','poor')`,
    ),
  ],
).enableRLS();

export const documents = pgTable("documents", {
  ...baseColumns,
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  storagePath: text("storage_path").notNull(),
  createdBy: uuid("created_by").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
}).enableRLS();

export const PROPERTY_RELATIONS = ["owner", "current_tenant"] as const;
export type PropertyRelation = (typeof PROPERTY_RELATIONS)[number];

/** Owner / tenant links — the heart of the invite mechanism. */
export const propertyPeople = pgTable(
  "property_people",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    relation: text("relation", { enum: PROPERTY_RELATIONS }).notNull(),
    inviteToken: text("invite_token").unique(),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
  },
  (t) => [
    unique("property_people_property_contact_relation_unique").on(
      t.propertyId,
      t.contactId,
      t.relation,
    ),
    check(
      "property_people_relation_check",
      sql`${t.relation} in ('owner','current_tenant')`,
    ),
  ],
).enableRLS();

/** Append-only audit log. Never updated or deleted (docs/03 header, rules/db). */
export const activityLog = pgTable(
  "activity_log",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    actorId: uuid("actor_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: uuid("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [
    // Append-only: members can read and insert; no UPDATE/DELETE policy exists.
    pgPolicy("activity_log_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isMember(t.workspaceId),
    }),
    pgPolicy("activity_log_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isMember(t.workspaceId)} and (${t.actorId} is null or ${t.actorId} = ${authUid})`,
    }),
  ],
).enableRLS();
