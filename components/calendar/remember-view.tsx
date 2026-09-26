"use client";

import { useEffect } from "react";

import {
  calendarViewCookie,
  type CalendarView,
} from "@/lib/calendar/grid";

/** Writes the open calendar view so the next visit can restore it. */
export function RememberCalendarView({ view }: { view: CalendarView }) {
  useEffect(() => {
    document.cookie = calendarViewCookie(view);
  }, [view]);
  return null;
}
