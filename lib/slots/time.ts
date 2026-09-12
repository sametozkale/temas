import { TZDate } from "@date-fns/tz";

/** Civil date `YYYY-MM-DD` of `instant` in `timeZone`. */
export function civilDate(instant: Date, timeZone: string): string {
  const z = TZDate.tz(timeZone, instant);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const d = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive list of civil dates from `from` to `to` (the day of each instant). */
export function eachDay(from: Date, to: Date, timeZone: string): string[] {
  const start = civilDate(from, timeZone);
  const end = civilDate(new Date(to.getTime() - 1), timeZone); // horizonEnd is exclusive
  if (to.getTime() === from.getTime()) return [];
  const out: string[] = [];
  let cursor = start;
  // Walk forward using UTC noon stamps so DST cannot skip a civil date.
  while (cursor <= end) {
    out.push(cursor);
    const [y, m, d] = cursor.split("-").map(Number) as [number, number, number];
    const next = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
    const ny = next.getUTCFullYear();
    const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(next.getUTCDate()).padStart(2, "0");
    cursor = `${ny}-${nm}-${nd}`;
    if (out.length > 400) break;
  }
  return out;
}

/**
 * Wall-clock time on a civil date in `timeZone`, as a UTC Date.
 * "17:00" stays 17:00 across DST (docs/04 §2).
 */
export function wallClockToUtc(
  date: string,
  minutes: number,
  timeZone: string,
): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const zoned = new TZDate(y, m - 1, d, hours, mins, 0, 0, timeZone);
  return new Date(zoned.getTime());
}

export function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
