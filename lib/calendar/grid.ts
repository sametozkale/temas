import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

import { civilDate } from "@/lib/slots/time";

export type CalendarView = "month" | "week" | "list";

export function parseYearMonth(value: string | undefined, now: Date) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year, month };
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = addMonths(new Date(Date.UTC(year, month - 1, 1)), delta);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function civilNoon(year: number, month: number, day: number, timeZone: string) {
  return new TZDate(year, month - 1, day, 12, 0, 0, 0, timeZone);
}

/** Monday-start month grid including leading/trailing days from adjacent months. */
export function monthGrid(year: number, month: number, timeZone: string) {
  const first = civilNoon(year, month, 1, timeZone);
  const start = startOfWeek(startOfMonth(first), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(first), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end }).map((day) => {
    const date = civilDate(day, timeZone);
    const inMonth = date.startsWith(monthKey(year, month));
    return {
      date,
      day: Number(date.slice(8, 10)),
      inMonth,
    };
  });
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function weekDays(
  anchorIso: string | undefined,
  timeZone: string,
  now = new Date(),
) {
  let anchor: Date;
  if (anchorIso && /^\d{4}-\d{2}-\d{2}$/.test(anchorIso)) {
    const [y, m, d] = anchorIso.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    anchor = civilNoon(y, m, d, timeZone);
  } else {
    const zoned = TZDate.tz(timeZone, now);
    anchor = civilNoon(
      zoned.getFullYear(),
      zoned.getMonth() + 1,
      zoned.getDate(),
      timeZone,
    );
  }
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) }).map((day) =>
    civilDate(day, timeZone),
  );
}

export function dayKeyInZone(value: Date, timeZone: string) {
  return civilDate(value, timeZone);
}

export function timeLabelInZone(value: Date, timeZone: string) {
  const zoned = TZDate.tz(timeZone, value);
  return `${String(zoned.getHours()).padStart(2, "0")}:${String(zoned.getMinutes()).padStart(2, "0")}`;
}
