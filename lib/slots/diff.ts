import type { ExistingSlot, GeneratedSlot, SlotDiff } from "./types";

function key(startsAt: Date): string {
  return startsAt.toISOString();
}

/**
 * Diff generated UTC slots against rows already stored.
 * Booked/blocked rows are never deleted (docs/04 §1, §5).
 */
export function diffSlots(
  generated: GeneratedSlot[],
  existing: ExistingSlot[],
): SlotDiff {
  const genKeys = new Set(generated.map((s) => key(s.startsAt)));
  const existingByStart = new Map(existing.map((s) => [key(s.startsAt), s]));

  const insert = generated.filter((s) => !existingByStart.has(key(s.startsAt)));
  const cancelIds: string[] = [];
  const blockIds: string[] = [];

  for (const row of existing) {
    if (genKeys.has(key(row.startsAt))) continue;
    if (row.status === "open") cancelIds.push(row.id);
    else if (row.status === "booked") blockIds.push(row.id);
    // blocked / cancelled: leave in place
  }

  return { insert, cancelIds, blockIds };
}
