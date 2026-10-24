import {
  ensureAccessToken,
  type GmailCredentials,
} from "@/lib/integrations/gmail/client";
import {
  readGoogleEventDetails,
  type GoogleEventGuest,
} from "@/lib/integrations/google/event-details";

const CALENDAR = "https://www.googleapis.com/calendar/v3";

export type GoogleCalendar = {
  id: string;
  name: string;
  primary: boolean;
  /** Google calendar colour, when the API sends one. */
  color: string | null;
  writable: boolean;
};

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  location: string | null;
  allDay: boolean;
  /** Inclusive civil start for all-day events (`YYYY-MM-DD`). */
  startDate: string | null;
  /** Exclusive civil end for all-day events. */
  endDate: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Event colour when Google painted this event itself; otherwise null. */
  color: string | null;
  colorId: string | null;
  /** Google id to update. A repeating event uses the series, so every instance stays one colour. */
  patchEventId: string;
  description: string | null;
  meetUrl: string | null;
  htmlUrl: string | null;
  guests: GoogleEventGuest[];
};

export type { GoogleEventGuest };

export class GoogleCalendarForbidden extends Error {
  constructor() {
    super("google_calendar_forbidden");
    this.name = "GoogleCalendarForbidden";
  }
}

async function calendarFetch(
  credentials: GmailCredentials,
  path: string,
  init?: RequestInit,
) {
  const token = await ensureAccessToken(credentials);
  const res = await fetch(`${CALENDAR}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 403 || res.status === 401)
    throw new GoogleCalendarForbidden();
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`google_calendar_${res.status}:${text.slice(0, 160)}`);
  }
  return res.json();
}

/**
 * Scopes that can call `calendarList.list`. `calendar.events` matches a
 * substring check for "/auth/calendar" but Google rejects the list call with
 * 403, so the account looks like it has no calendars.
 */
const CALENDAR_LIST_SCOPES = new Set([
  "calendar",
  "calendar.readonly",
  "calendar.calendarlist",
  "calendar.calendarlist.readonly",
]);

export function hasCalendarScope(scope: string | undefined) {
  if (!scope) return false;
  return scope.split(/\s+/).some((item) => {
    const name = item.split("/").pop();
    return Boolean(name && CALENDAR_LIST_SCOPES.has(name));
  });
}

/** `calendar.events` can recolor an event. Read-only calendar scopes cannot. */
export function canColorGoogleEvents(scope: string | undefined) {
  if (!scope) return false;
  return scope.split(/\s+/).some((item) => {
    const name = item.split("/").pop();
    return name === "calendar" || name === "calendar.events";
  });
}

/** Whether this stored Google grant can read calendars. Dev mailboxes cannot. */
export function googleIncludesCalendar(raw: unknown) {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as { mode?: string; scope?: string };
  if (record.mode === "dev") return false;
  return hasCalendarScope(record.scope);
}

export function googleIsDevMailbox(raw: unknown) {
  if (!raw || typeof raw !== "object") return false;
  return (raw as { mode?: string }).mode === "dev";
}

export type GoogleEventLabel = {
  id: string;
  color: string;
  /** Google's label name, when the calendar has one. */
  name: string;
};

export function resolveGoogleEventColor(
  eventLabelId: string | null | undefined,
  colorId: string | null | undefined,
  labels: Map<string, string>,
  eventColors: Map<string, string>,
) {
  if (eventLabelId) {
    const color = labels.get(eventLabelId);
    if (color) return { color, swatchId: eventLabelId };
  }
  if (colorId) {
    const color = eventColors.get(colorId);
    if (color) return { color, swatchId: colorId };
  }
  return { color: null, swatchId: null };
}

export function safeGoogleColor(value: string | null | undefined) {
  if (!value) return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

export async function listGoogleColors(credentials: GmailCredentials) {
  try {
    const data = (await calendarFetch(credentials, "/colors")) as {
      event?: Record<string, { background?: string }>;
    };
    const colors = new Map<string, string>();
    for (const [id, entry] of Object.entries(data.event ?? {})) {
      const color = safeGoogleColor(entry.background);
      if (color) colors.set(id, color);
    }
    return colors;
  } catch (error) {
    if (error instanceof GoogleCalendarForbidden) throw error;
    return new Map<string, string>();
  }
}

export async function listCalendarLabels(
  credentials: GmailCredentials,
  calendarId: string,
) {
  try {
    const data = (await calendarFetch(
      credentials,
      `/calendars/${encodeURIComponent(calendarId)}`,
    )) as {
      labelProperties?: {
        eventLabels?: {
          id?: string;
          backgroundColor?: string;
          name?: string;
        }[];
      };
    };
    const labels: GoogleEventLabel[] = [];
    for (const label of data.labelProperties?.eventLabels ?? []) {
      const color = safeGoogleColor(label.backgroundColor);
      if (!label.id || !color) continue;
      labels.push({
        id: label.id,
        color,
        name: label.name?.trim().slice(0, 50) ?? "",
      });
    }
    return labels;
  } catch (error) {
    if (error instanceof GoogleCalendarForbidden) throw error;
    return [];
  }
}

export type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  summaryOverride?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
  hidden?: boolean;
  /** Google Calendar UI checkbox. Omitted means false. Not a reason to drop the row. */
  selected?: boolean;
  deleted?: boolean;
};

const CALENDAR_LIST_MAX_PAGES = 20;

/**
 * One page of `calendarList.list`.
 *
 * `minAccessRole` is intentionally omitted. Google applies it after cutting
 * the page, so the first response can be `items: []` with a `nextPageToken`
 * while the primary calendar sits on the next page. `showHidden` defaults to
 * false and does the same to calendars the user hid in Google Calendar.
 * `showDeleted` stays false so removed entries are not calendars to pick.
 */
export function calendarListPath(pageToken?: string) {
  const query = new URLSearchParams({
    maxResults: "250",
    showHidden: "true",
    showDeleted: "false",
  });
  if (pageToken) query.set("pageToken", pageToken);
  return `/users/me/calendarList?${query.toString()}`;
}

export function readGoogleCalendarList(items: GoogleCalendarListEntry[]) {
  const seen = new Set<string>();
  const calendars: GoogleCalendar[] = [];
  for (const item of items) {
    if (!item.id || item.deleted === true || seen.has(item.id)) continue;
    seen.add(item.id);
    const name =
      item.summaryOverride?.trim() || item.summary?.trim() || item.id;
    calendars.push({
      id: item.id,
      name,
      primary: item.primary === true,
      color: safeGoogleColor(item.backgroundColor),
      writable:
        item.accessRole === "owner" ||
        item.accessRole === "writer" ||
        item.accessRole === "writerWithoutPrivateAccess",
    });
  }
  return calendars;
}

export async function listGoogleCalendars(credentials: GmailCredentials) {
  const items: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  const seenTokens = new Set<string>();
  for (let page = 0; page < CALENDAR_LIST_MAX_PAGES; page += 1) {
    const data = (await calendarFetch(
      credentials,
      calendarListPath(pageToken),
    )) as {
      items?: GoogleCalendarListEntry[];
      nextPageToken?: string;
    };
    items.push(...(data.items ?? []));
    const next = data.nextPageToken;
    if (!next || seenTokens.has(next)) break;
    seenTokens.add(next);
    pageToken = next;
  }
  return readGoogleCalendarList(items);
}

export async function listGoogleEvents(
  credentials: GmailCredentials,
  calendar: GoogleCalendar,
  timeMin: Date,
  timeMax: Date,
  eventColors: Map<string, string>,
  labels: Map<string, string>,
) {
  const query = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = (await calendarFetch(
    credentials,
    `/calendars/${encodeURIComponent(calendar.id)}/events?${query.toString()}`,
  )) as {
    items?: {
      id?: string;
      status?: string;
      summary?: string;
      location?: string;
      colorId?: string;
      eventLabelId?: string;
      recurringEventId?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      description?: string;
      hangoutLink?: string;
      htmlLink?: string;
      conferenceData?: {
        entryPoints?: { entryPointType?: string; uri?: string }[];
      };
      attendees?: {
        email?: string;
        displayName?: string;
        responseStatus?: string;
        organizer?: boolean;
        self?: boolean;
      }[];
    }[];
  };
  const events: GoogleCalendarEvent[] = [];
  for (const item of data.items ?? []) {
    if (!item.id || item.status === "cancelled") continue;
    const allDay = Boolean(item.start?.date && !item.start.dateTime);
    const resolved = resolveGoogleEventColor(
      item.eventLabelId,
      item.colorId,
      labels,
      eventColors,
    );
    const details = readGoogleEventDetails(item);
    events.push({
      id: `${calendar.id}:${item.id}`,
      calendarId: calendar.id,
      calendarName: calendar.name,
      title: item.summary?.trim() || calendar.name,
      location: item.location?.trim() || null,
      allDay,
      startDate: allDay ? (item.start?.date ?? null) : null,
      endDate: allDay ? (item.end?.date ?? null) : null,
      startsAt: item.start?.dateTime ? new Date(item.start.dateTime) : null,
      endsAt: item.end?.dateTime ? new Date(item.end.dateTime) : null,
      color: resolved.color,
      colorId: resolved.swatchId,
      patchEventId: item.recurringEventId || item.id,
      description: details.description,
      meetUrl: details.meetUrl,
      htmlUrl: details.htmlUrl,
      guests: details.guests,
    });
  }
  return events;
}

export async function patchGoogleEventColor(
  credentials: GmailCredentials,
  calendarId: string,
  eventId: string,
  swatchId: string,
) {
  const label =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      swatchId,
    );
  const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${
    label ? "?eventLabelVersion=1" : ""
  }`;
  await calendarFetch(credentials, path, {
    method: "PATCH",
    body: JSON.stringify(
      label ? { eventLabelId: swatchId } : { colorId: swatchId },
    ),
  });
}
