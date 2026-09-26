/** Today's events on Home, in start order. Past days and later days stay off this row. */

import type { GoogleEventGuest } from "@/lib/integrations/google/event-details";

export type HomeCalendarEvent = {
  id: string;
  /** Civil day, `YYYY-MM-DD`, in the workspace timezone. */
  day: string;
  title: string;
  /** Clock label. Empty on an all-day event. */
  time: string;
  /** Epoch ms of the start. Null on an all-day event. */
  startMs: number | null;
  /** Minutes from local midnight when the event ends. Null when unknown. */
  endMin: number | null;
  google?: {
    when: string;
    location: string | null;
    calendarName: string;
    description: string | null;
    meetUrl: string | null;
    htmlUrl: string | null;
    guests: GoogleEventGuest[];
  } | null;
};

export function selectHomeCalendarEvents(
  events: HomeCalendarEvent[],
  input: { todayKey: string },
): HomeCalendarEvent[] {
  return events
    .filter((event) => event.day === input.todayKey)
    .sort(byStart);
}

function byStart(a: HomeCalendarEvent, b: HomeCalendarEvent) {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  if (a.startMs == null && b.startMs == null) return 0;
  if (a.startMs == null) return -1;
  if (b.startMs == null) return 1;
  return a.startMs - b.startMs;
}
