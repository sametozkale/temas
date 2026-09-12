import { and, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  availabilityExceptions,
  availabilityWindows,
  properties,
  propertyPeople,
  viewingCalendars,
  viewingSlots,
} from "@/lib/db/schema";
import {
  applyExceptions,
  diffSlots,
  expandRRule,
  generateSlots,
  parseTimeToMinutes,
  type DayWindows,
  type ExistingSlot,
} from "@/lib/slots";

export type MaterializeResult = {
  calendarId: string;
  inserted: number;
  cancelled: number;
  blocked: number;
  reopened: number;
  generated: number;
};

function horizon(now: Date, maxDaysAhead: number) {
  const horizonStart = now;
  const horizonEnd = new Date(now.getTime() + maxDaysAhead * 86_400_000);
  return { horizonStart, horizonEnd };
}

/**
 * Rebuild open slots for a calendar (docs/04 §3). Idempotent: a second run
 * against the same windows produces an empty diff.
 */
export async function materializeCalendar(
  calendarId: string,
  now = new Date(),
): Promise<MaterializeResult> {
  const [calendar] = await db
    .select({
      id: viewingCalendars.id,
      propertyId: viewingCalendars.propertyId,
      slotDurationMin: viewingCalendars.slotDurationMin,
      bufferMin: viewingCalendars.bufferMin,
      minNoticeHours: viewingCalendars.minNoticeHours,
      maxDaysAhead: viewingCalendars.maxDaysAhead,
      timezone: properties.timezone,
    })
    .from(viewingCalendars)
    .innerJoin(properties, eq(properties.id, viewingCalendars.propertyId))
    .where(eq(viewingCalendars.id, calendarId))
    .limit(1);

  if (!calendar) {
    return {
      calendarId,
      inserted: 0,
      cancelled: 0,
      blocked: 0,
      reopened: 0,
      generated: 0,
    };
  }

  const { horizonStart, horizonEnd } = horizon(now, calendar.maxDaysAhead);

  const windows = await db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.viewingCalendarId, calendarId));

  const windowIds = windows.map((w) => w.id);
  const exceptions = windowIds.length
    ? await db
        .select()
        .from(availabilityExceptions)
        .where(inArray(availabilityExceptions.availabilityWindowId, windowIds))
    : [];

  const tenants = await db
    .select({ id: propertyPeople.id })
    .from(propertyPeople)
    .where(
      and(
        eq(propertyPeople.propertyId, calendar.propertyId),
        eq(propertyPeople.relation, "current_tenant"),
      ),
    );

  const byKind = {
    agent: windows.filter((w) => w.participantKind === "agent"),
    current_tenant: windows.filter(
      (w) => w.participantKind === "current_tenant",
    ),
    owner: windows.filter((w) => w.participantKind === "owner"),
  };

  const expandKind = (kind: keyof typeof byKind): DayWindows[] => {
    const rows = byKind[kind];
    const days: DayWindows[] = [];
    for (const w of rows) {
      const expanded = expandRRule(
        {
          rrule: w.rrule,
          timezone: w.timezone || calendar.timezone,
          startMin: parseTimeToMinutes(w.startTime),
          endMin: parseTimeToMinutes(w.endTime),
          effectiveFrom: w.effectiveFrom,
          effectiveUntil: w.effectiveUntil,
        },
        horizonStart,
        horizonEnd,
      );
      const ex = exceptions.filter((e) => e.availabilityWindowId === w.id);
      days.push(
        ...applyExceptions(
          expanded,
          ex.map((e) => ({
            date: e.date,
            kind: e.kind,
            startMin: e.startTime ? parseTimeToMinutes(e.startTime) : null,
            endMin: e.endTime ? parseTimeToMinutes(e.endTime) : null,
          })),
        ),
      );
    }
    return days;
  };

  const participantSets: DayWindows[][] = [expandKind("agent")];
  if (tenants.length > 0 || byKind.current_tenant.length > 0) {
    participantSets.push(expandKind("current_tenant"));
  }
  if (byKind.owner.length > 0) {
    participantSets.push(expandKind("owner"));
  }

  const existing = await db
    .select({
      id: viewingSlots.id,
      startsAt: viewingSlots.startsAt,
      endsAt: viewingSlots.endsAt,
      status: viewingSlots.status,
    })
    .from(viewingSlots)
    .where(
      and(
        eq(viewingSlots.viewingCalendarId, calendarId),
        gte(viewingSlots.startsAt, horizonStart),
      ),
    );

  const occupied = existing.filter(
    (s) => s.status === "booked" || s.status === "blocked",
  );

  const generated = generateSlots({
    timezone: calendar.timezone,
    horizonStart,
    horizonEnd,
    slotDurationMin: calendar.slotDurationMin,
    bufferMin: calendar.bufferMin,
    participantSets,
    existingBooked: [],
    minNoticeHours: calendar.minNoticeHours,
    now,
  }).filter(
    (g) =>
      !occupied.some(
        (o) =>
          g.startsAt.getTime() !== o.startsAt.getTime() &&
          g.startsAt < o.endsAt &&
          g.endsAt > o.startsAt,
      ),
  );

  const existingForDiff: ExistingSlot[] = existing
    .filter((s) => s.status !== "cancelled")
    .map((s) => ({ id: s.id, startsAt: s.startsAt, status: s.status }));

  const cancelledExisting = existing.filter((s) => s.status === "cancelled");
  const cancelledByStart = new Map(
    cancelledExisting.map((s) => [s.startsAt.toISOString(), s]),
  );

  const diff = diffSlots(generated, existingForDiff);

  const reopen = diff.insert.filter((s) =>
    cancelledByStart.has(s.startsAt.toISOString()),
  );
  const freshInsert = diff.insert.filter(
    (s) => !cancelledByStart.has(s.startsAt.toISOString()),
  );

  if (freshInsert.length) {
    await db
      .insert(viewingSlots)
      .values(
        freshInsert.map((s) => ({
          viewingCalendarId: calendarId,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          status: "open" as const,
        })),
      )
      .onConflictDoNothing();
  }

  if (reopen.length) {
    const ids = reopen.map(
      (s) => cancelledByStart.get(s.startsAt.toISOString())!.id,
    );
    await db
      .update(viewingSlots)
      .set({ status: "open" })
      .where(inArray(viewingSlots.id, ids));
  }

  if (diff.cancelIds.length) {
    await db
      .update(viewingSlots)
      .set({ status: "cancelled" })
      .where(inArray(viewingSlots.id, diff.cancelIds));
  }

  if (diff.blockIds.length) {
    await db
      .update(viewingSlots)
      .set({ status: "blocked" })
      .where(inArray(viewingSlots.id, diff.blockIds));
  }

  // Drop expired open slots that are behind the horizon.
  await db
    .update(viewingSlots)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(viewingSlots.viewingCalendarId, calendarId),
        eq(viewingSlots.status, "open"),
        lt(viewingSlots.endsAt, now),
      ),
    );

  return {
    calendarId,
    inserted: freshInsert.length,
    reopened: reopen.length,
    cancelled: diff.cancelIds.length,
    blocked: diff.blockIds.length,
    generated: generated.length,
  };
}

export async function materializeAllActive(now = new Date()) {
  const rows = await db
    .select({ id: viewingCalendars.id })
    .from(viewingCalendars);
  const results = [];
  for (const row of rows) {
    results.push(await materializeCalendar(row.id, now));
  }
  return results;
}
