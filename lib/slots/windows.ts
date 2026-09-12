import type { UtcInterval, Window } from "./types";

/** Merge overlapping / adjacent `[start, end)` windows. */
export function unionWindows(windows: Window[]): Window[] {
  const valid = windows
    .filter((w) => w.endMin > w.startMin)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out: Window[] = [];
  for (const w of valid) {
    const last = out[out.length - 1];
    if (!last || w.startMin > last.endMin) {
      out.push({ ...w });
    } else if (w.endMin > last.endMin) {
      last.endMin = w.endMin;
    }
  }
  return out;
}

function intersectTwo(a: Window[], b: Window[]): Window[] {
  const left = unionWindows(a);
  const right = unionWindows(b);
  const out: Window[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const x = left[i]!;
    const y = right[j]!;
    const start = Math.max(x.startMin, y.startMin);
    const end = Math.min(x.endMin, y.endMin);
    if (end > start) out.push({ startMin: start, endMin: end });
    if (x.endMin < y.endMin) i += 1;
    else j += 1;
  }
  return out;
}

/**
 * Union each set, then intersect across sets (docs/04 §2).
 * An empty set yields no intersection.
 */
export function intersectAll(sets: Window[][]): Window[] {
  if (sets.length === 0) return [];
  if (sets.some((s) => unionWindows(s).length === 0)) return [];
  return sets.map(unionWindows).reduce((acc, s) => intersectTwo(acc, s));
}

/**
 * Tile `interval` onto a grid of `durMin` slots stepped by `stepMin`.
 * The trailing piece that cannot fit a full slot is dropped.
 */
export function tile(
  interval: Window,
  stepMin: number,
  durMin: number,
): Window[] {
  if (stepMin <= 0 || durMin <= 0) return [];
  const out: Window[] = [];
  for (
    let start = interval.startMin;
    start + durMin <= interval.endMin;
    start += stepMin
  ) {
    out.push({ startMin: start, endMin: start + durMin });
  }
  return out;
}

/** Half-open overlap: touching at an endpoint is not an overlap. */
export function overlapsAny(slot: UtcInterval, booked: UtcInterval[]): boolean {
  return booked.some(
    (b) => slot.startsAt < b.endsAt && slot.endsAt > b.startsAt,
  );
}
