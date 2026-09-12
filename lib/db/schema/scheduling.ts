import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  WRITE_ROLES_ALL,
  authenticatedRole,
  authUid,
  hasCalendarRole,
  hasWindowRole,
  isCalendarMember,
  isCalendarPerson,
  isPropertyMember,
  isPropertyPerson,
  isWindowMember,
  propertyChildPolicies,
} from "../rls";
import { baseColumns, timestamps } from "./_shared";
import { contacts } from "./contacts";
import { forms } from "./forms";
import { properties } from "./properties";

// docs/03 §4 — Viewing & Scheduling (core)
// All instants are timestamptz (UTC). Recurring windows: rrule + timezone.

/** One per property. */
export const viewingCalendars = pgTable(
  "viewing_calendars",
  {
    ...baseColumns,
    propertyId: uuid("property_id")
      .notNull()
      .unique()
      .references(() => properties.id, { onDelete: "cascade" }),
    slotDurationMin: integer("slot_duration_min").notNull().default(30),
    bufferMin: integer("buffer_min").notNull().default(15),
    minNoticeHours: integer("min_notice_hours").notNull().default(4),
    maxDaysAhead: integer("max_days_ahead").notNull().default(21),
    requireFormFirst: boolean("require_form_first").notNull().default(false),
    formId: uuid("form_id").references(() => forms.id, {
      onDelete: "set null",
    }),
    publicToken: text("public_token").notNull().unique(),
    isPublished: boolean("is_published").notNull().default(false),
  },
  (t) => [
    ...propertyChildPolicies("viewing_calendars", t.propertyId, {
      peopleSelect: true,
    }),
  ],
).enableRLS();

export const PARTICIPANT_KINDS = ["agent", "current_tenant", "owner"] as const;
export type ParticipantKind = (typeof PARTICIPANT_KINDS)[number];

function calendarChildPolicies(
  table: string,
  calendarId: Parameters<typeof isCalendarMember>[0],
) {
  return [
    pgPolicy(`${table}_select_members`, {
      for: "select",
      to: authenticatedRole,
      using: sql`(${isCalendarMember(calendarId)} or ${isCalendarPerson(calendarId)})`,
    }),
    pgPolicy(`${table}_insert_roles`, {
      for: "insert",
      to: authenticatedRole,
      withCheck: hasCalendarRole(calendarId, WRITE_ROLES_ALL),
    }),
    pgPolicy(`${table}_update_roles`, {
      for: "update",
      to: authenticatedRole,
      using: hasCalendarRole(calendarId, WRITE_ROLES_ALL),
      withCheck: hasCalendarRole(calendarId, WRITE_ROLES_ALL),
    }),
    pgPolicy(`${table}_delete_roles`, {
      for: "delete",
      to: authenticatedRole,
      using: hasCalendarRole(calendarId, WRITE_ROLES_ALL),
    }),
  ];
}

/** Who is available: agent and/or current tenant (and optionally owner). */
export const availabilityWindows = pgTable(
  "availability_windows",
  {
    ...baseColumns,
    viewingCalendarId: uuid("viewing_calendar_id")
      .notNull()
      .references(() => viewingCalendars.id, { onDelete: "cascade" }),
    participantKind: text("participant_kind", {
      enum: PARTICIPANT_KINDS,
    }).notNull(),
    /** For the agent this is the workspace member's contact. */
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    /** e.g. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR */
    rrule: text("rrule").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    timezone: text("timezone").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveUntil: date("effective_until"),
  },
  (t) => [
    check(
      "availability_windows_participant_kind_check",
      sql`${t.participantKind} in ('agent','current_tenant','owner')`,
    ),
    ...calendarChildPolicies("availability_windows", t.viewingCalendarId),
  ],
).enableRLS();

export const EXCEPTION_KINDS = ["block", "override"] as const;

/** "I'm off that day" / one-off addition. */
export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    ...baseColumns,
    availabilityWindowId: uuid("availability_window_id")
      .notNull()
      .references(() => availabilityWindows.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    kind: text("kind", { enum: EXCEPTION_KINDS }).notNull(),
    /** Filled when kind = override. */
    startTime: time("start_time"),
    endTime: time("end_time"),
  },
  (t) => [
    check(
      "availability_exceptions_kind_check",
      sql`${t.kind} in ('block','override')`,
    ),
    pgPolicy("availability_exceptions_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWindowMember(t.availabilityWindowId),
    }),
    pgPolicy("availability_exceptions_insert_roles", {
      for: "insert",
      to: authenticatedRole,
      withCheck: hasWindowRole(t.availabilityWindowId, WRITE_ROLES_ALL),
    }),
    pgPolicy("availability_exceptions_update_roles", {
      for: "update",
      to: authenticatedRole,
      using: hasWindowRole(t.availabilityWindowId, WRITE_ROLES_ALL),
      withCheck: hasWindowRole(t.availabilityWindowId, WRITE_ROLES_ALL),
    }),
    pgPolicy("availability_exceptions_delete_roles", {
      for: "delete",
      to: authenticatedRole,
      using: hasWindowRole(t.availabilityWindowId, WRITE_ROLES_ALL),
    }),
  ],
).enableRLS();

export const SLOT_STATUSES = [
  "open",
  "booked",
  "blocked",
  "cancelled",
] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

/** Materialized intersection — produced by Inngest via lib/slots. [starts_at, ends_at) */
export const viewingSlots = pgTable(
  "viewing_slots",
  {
    ...baseColumns,
    viewingCalendarId: uuid("viewing_calendar_id")
      .notNull()
      .references(() => viewingCalendars.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: SLOT_STATUSES }).notNull().default("open"),
  },
  (t) => [
    unique("viewing_slots_calendar_starts_at_unique").on(
      t.viewingCalendarId,
      t.startsAt,
    ),
    check(
      "viewing_slots_status_check",
      sql`${t.status} in ('open','booked','blocked','cancelled')`,
    ),
    ...calendarChildPolicies("viewing_slots", t.viewingCalendarId),
  ],
).enableRLS();

export const BOOKING_STATUSES = [
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookings = pgTable(
  "bookings",
  {
    ...baseColumns,
    viewingSlotId: uuid("viewing_slot_id")
      .notNull()
      .references(() => viewingSlots.id, { onDelete: "restrict" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    /** Prospect (OTP-verified). */
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    status: text("status", { enum: BOOKING_STATUSES })
      .notNull()
      .default("confirmed"),
    note: text("note"),
    cancelToken: text("cancel_token").unique(),
    cancelledBy: text("cancelled_by"),
  },
  (t) => [
    check(
      "bookings_status_check",
      sql`${t.status} in ('confirmed','cancelled','completed','no_show')`,
    ),
    pgPolicy("bookings_select_members", {
      for: "select",
      to: authenticatedRole,
      using: sql`(${isPropertyMember(t.propertyId)} or (${isPropertyPerson(t.propertyId)} and exists (
        select 1 from ${contacts} c where c.id = ${t.contactId} and c.user_id = ${authUid}
      )))`,
    }),
    pgPolicy("bookings_insert_roles", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.workspace_role(public.property_workspace(${t.propertyId})) in ('owner','agent','assistant')`,
    }),
    pgPolicy("bookings_update_roles", {
      for: "update",
      to: authenticatedRole,
      using: sql`public.workspace_role(public.property_workspace(${t.propertyId})) in ('owner','agent','assistant')`,
      withCheck: sql`public.workspace_role(public.property_workspace(${t.propertyId})) in ('owner','agent','assistant')`,
    }),
  ],
).enableRLS();

/**
 * Email OTPs for public booking (docs/04 §4). Accessed from Server Actions
 * with the system DB client after the public token is validated — no anon RLS.
 */
export const emailOtps = pgTable("email_otps", {
  ...baseColumns,
  purpose: text("purpose").notNull().default("booking"),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  payload: jsonb("payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  ip: text("ip"),
}).enableRLS();

/** Durable rate-limit counters (docs/04 §4: OTP / booking caps). */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
).enableRLS();
