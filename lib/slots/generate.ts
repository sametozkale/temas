import { civilDate, eachDay, wallClockToUtc } from "./time";
import type {
  DayWindows,
  GeneratedSlot,
  SlotEngineInput,
  Window,
} from "./types";
import { intersectAll, overlapsAny, tile, unionWindows } from "./windows";

function windowsForDay(set: DayWindows[], date: string): Window[] {
  const collected: Window[] = [];
  for (const day of set) {
    if (day.date === date) collected.push(...day.windows);
  }
  return unionWindows(collected);
}

function isTooSoon(startsAt: Date, now: Date, minNoticeHours: number): boolean {
  return startsAt.getTime() < now.getTime() + minNoticeHours * 3_600_000;
}

/**
 * Pure slot generator (docs/04). `now` is injected — never Date.now().
 */
export function generateSlots(input: SlotEngineInput): GeneratedSlot[] {
  const step = input.slotDurationMin + input.bufferMin;
  const days = eachDay(input.horizonStart, input.horizonEnd, input.timezone);
  const out: GeneratedSlot[] = [];

  for (const date of days) {
    const sets = input.participantSets.map((set) => windowsForDay(set, date));
    if (sets.some((s) => s.length === 0)) continue;
    for (const iv of intersectAll(sets)) {
      for (const piece of tile(iv, step, input.slotDurationMin)) {
        const startsAt = wallClockToUtc(date, piece.startMin, input.timezone);
        const endsAt = wallClockToUtc(date, piece.endMin, input.timezone);
        if (isTooSoon(startsAt, input.now, input.minNoticeHours)) continue;
        if (startsAt < input.horizonStart || startsAt >= input.horizonEnd) {
          continue;
        }
        if (civilDate(startsAt, input.timezone) !== date) continue;
        if (overlapsAny({ startsAt, endsAt }, input.existingBooked)) continue;
        out.push({ startsAt, endsAt });
      }
    }
  }
  return out;
}
