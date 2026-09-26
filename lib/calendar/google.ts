import { and, eq } from "drizzle-orm";

import { minutesInZone, shiftIsoDate } from "@/lib/calendar/grid";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import {
  asGmailCredentials,
  persistGmailCredentials,
} from "@/lib/integrations/gmail/sync";
import type { GoogleEventGuest } from "@/lib/integrations/google/event-details";
import {
  GoogleCalendarForbidden,
  canColorGoogleEvents,
  hasCalendarScope,
  listCalendarLabels,
  listGoogleCalendars,
  listGoogleColors,
  listGoogleEvents,
  type GoogleCalendar,
} from "@/lib/integrations/google/calendar";

export type GoogleCalendarChoice = GoogleCalendar & { selected: boolean };

export type GoogleEventSwatch = { id: string; color: string; name?: string };

export type GoogleDayEvent = {
  id: string;
  day: string;
  time: string;
  title: string;
  when: string;
  location: string | null;
  calendarName: string;
  sort: number;
  /** Minutes from local midnight. Null on an all-day event. */
  startMin: number | null;
  endMin: number | null;
  color: string | null;
  colorId: string | null;
  calendarId: string;
  /** Series id when the event repeats, otherwise the event id. */
  seriesKey: string;
  writable: boolean;
  description: string | null;
  meetUrl: string | null;
  htmlUrl: string | null;
  guests: GoogleEventGuest[];
};

export type GoogleOverlay = {
  status: "off" | "reconnect" | "ready";
  calendars: GoogleCalendarChoice[];
  events: GoogleDayEvent[];
  colors: GoogleEventSwatch[];
  /** Event label colours for each Google calendar, in Google's order. */
  labels: Record<string, GoogleEventSwatch[]>;
  canColor: boolean;
};

/** Inclusive start, exclusive end, clipped so a long hold does not fill the grid. */
export function allDayKeys(start: string, end: string | null) {
  const keys: string[] = [];
  let cursor = start;
  const stop = end && end > start ? end : shiftIsoDate(start, 1);
  let guard = 0;
  while (cursor < stop && guard < 21) {
    keys.push(cursor);
    cursor = shiftIsoDate(cursor, 1);
    guard += 1;
  }
  return keys.length > 0 ? keys : [start];
}

export async function loadGoogleOverlay(
  userId: string,
  timeMin: Date,
  timeMax: Date,
  timeZone: string,
  formatTime: (value: Date) => string,
): Promise<GoogleOverlay> {
  const empty: GoogleOverlay = {
    status: "off",
    calendars: [],
    events: [],
    colors: [],
    labels: {},
    canColor: false,
  };
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return empty;
  const credentials = asGmailCredentials(row.credentials);
  if (credentials.mode === "dev" || !credentials.refreshToken) return empty;
  if (!hasCalendarScope(credentials.scope)) {
    return { status: "reconnect", calendars: [], events: [], colors: [], labels: {}, canColor: false };
  }

  let calendars: GoogleCalendar[];
  try {
    calendars = await listGoogleCalendars(credentials);
  } catch (error) {
    if (error instanceof GoogleCalendarForbidden) {
      return { status: "reconnect", calendars: [], events: [], colors: [], labels: {}, canColor: false };
    }
    return empty;
  }

  const selected = resolveSelection(calendars, credentials.selectedCalendarIds);
  if (!sameIds(selected, credentials.selectedCalendarIds)) {
    credentials.selectedCalendarIds = selected;
    await persistGmailCredentials(row.id, credentials);
  }

  const chosen = calendars.filter((calendar) => selected.includes(calendar.id));
  let eventColors = new Map<string, string>();
  try {
    eventColors = await listGoogleColors(credentials);
  } catch (error) {
    if (error instanceof GoogleCalendarForbidden) {
      return { status: "reconnect", calendars: [], events: [], colors: [], labels: {}, canColor: false };
    }
  }
  const events: GoogleDayEvent[] = [];
  const labels: Record<string, GoogleEventSwatch[]> = {};
  for (const calendar of chosen) {
    let labelList: GoogleEventSwatch[] = [];
    try {
      labelList = await listCalendarLabels(credentials, calendar.id);
    } catch (error) {
      if (error instanceof GoogleCalendarForbidden) {
        return { status: "reconnect", calendars: [], events: [], colors: [], labels: {}, canColor: false };
      }
    }
    labels[calendar.id] = labelList;
    const labelColors = new Map(labelList.map((label) => [label.id, label.color]));
    let rows;
    try {
      rows = await listGoogleEvents(
        credentials,
        calendar,
        timeMin,
        timeMax,
        eventColors,
        labelColors,
      );
    } catch (error) {
      if (error instanceof GoogleCalendarForbidden) {
        return { status: "reconnect", calendars: [], events: [], colors: [], labels: {}, canColor: false };
      }
      continue;
    }
    for (const event of rows) {
      if (event.allDay && event.startDate) {
        for (const day of allDayKeys(event.startDate, event.endDate)) {
          events.push({
            id: `${event.id}:${day}`,
            day,
            time: "",
            title: event.title,
            when: "",
            location: event.location,
            calendarName: event.calendarName,
            sort: 0,
            startMin: null,
            endMin: null,
            color: event.color ?? calendar.color,
            colorId: event.colorId,
            calendarId: event.calendarId,
            seriesKey: event.patchEventId,
            writable: calendar.writable,
            description: event.description,
            meetUrl: event.meetUrl,
            htmlUrl: event.htmlUrl,
            guests: event.guests,
          });
        }
        continue;
      }
      if (!event.startsAt) continue;
      const day = civilDay(event.startsAt, timeZone);
      const start = formatTime(event.startsAt);
      const end = event.endsAt ? formatTime(event.endsAt) : "";
      const span = daySpan(event.startsAt, event.endsAt, timeZone);
      events.push({
        id: event.id,
        day,
        time: start,
        title: event.title,
        when: end ? `${start}–${end}` : start,
        location: event.location,
        calendarName: event.calendarName,
        sort: event.startsAt.getTime(),
        startMin: span.start,
        endMin: span.end,
        color: event.color ?? calendar.color,
        colorId: event.colorId,
        calendarId: event.calendarId,
        seriesKey: event.patchEventId,
        writable: calendar.writable,
        description: event.description,
        meetUrl: event.meetUrl,
        htmlUrl: event.htmlUrl,
        guests: event.guests,
      });
    }
  }

  return {
    status: "ready",
    calendars: calendars.map((calendar) => ({
      ...calendar,
      selected: selected.includes(calendar.id),
    })),
    events,
    colors: [...eventColors.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([id, color]) => ({ id, color, name: "" })),
    labels,
    canColor: canColorGoogleEvents(credentials.scope),
  };
}

function resolveSelection(
  calendars: GoogleCalendar[],
  saved: string[] | undefined,
) {
  const ids = new Set(calendars.map((calendar) => calendar.id));
  if (!saved) {
    const primary = calendars.find((calendar) => calendar.primary);
    return primary ? [primary.id] : calendars.slice(0, 1).map((calendar) => calendar.id);
  }
  return saved.filter((id) => ids.has(id));
}

function sameIds(next: string[], saved: string[] | undefined) {
  if (!saved) return false;
  if (next.length !== saved.length) return false;
  return next.every((id, index) => id === saved[index]);
}

/** Timed span on the start's civil day. A hold that crosses midnight stops at 24:00. */
function daySpan(startsAt: Date, endsAt: Date | null, timeZone: string) {
  const start = minutesInZone(startsAt, timeZone);
  if (!endsAt) return { start, end: Math.min(24 * 60, start + 60) };
  const endDay = civilDay(endsAt, timeZone);
  const startDay = civilDay(startsAt, timeZone);
  if (endDay > startDay) return { start, end: 24 * 60 };
  const end = minutesInZone(endsAt, timeZone);
  if (end <= start) return { start, end: Math.min(24 * 60, start + 30) };
  return { start, end };
}

function civilDay(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
