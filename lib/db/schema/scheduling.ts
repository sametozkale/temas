import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { baseColumns } from "./_shared";
import { contacts } from "./contacts";
import { forms } from "./forms";
import { properties } from "./properties";

// docs/03 §4 — Viewing & Scheduling (core)
// All instants are timestamptz (UTC). Recurring windows: rrule + timezone.

/** One per property. */
export const viewingCalendars = pgTable("viewing_calendars", {
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
  formId: uuid("form_id").references(() => forms.id, { onDelete: "set null" }),
  publicToken: text("public_token").notNull().unique(),
  isPublished: boolean("is_published").notNull().default(false),
}).enableRLS();

export const PARTICIPANT_KINDS = ["agent", "current_tenant", "owner"] as const;
export type ParticipantKind = (typeof PARTICIPANT_KINDS)[number];

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
  ],
).enableRLS();
