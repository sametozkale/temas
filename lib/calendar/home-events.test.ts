import { describe, expect, it } from "vitest";

import { selectHomeCalendarEvents } from "@/lib/calendar/home-events";

const NOW = Date.parse("2026-09-26T10:00:00.000Z");

function event(
  partial: Partial<{
    id: string;
    day: string;
    title: string;
    time: string;
    startMs: number | null;
    endMin: number | null;
  }> & { id: string; day: string },
) {
  return {
    title: partial.id,
    time: partial.time ?? "12:00",
    startMs: partial.startMs === undefined ? NOW + 3_600_000 : partial.startMs,
    endMin: partial.endMin === undefined ? 14 * 60 : partial.endMin,
    ...partial,
  };
}

describe("selectHomeCalendarEvents", () => {
  it("lists every event today, in start order", () => {
    const selected = selectHomeCalendarEvents(
      [
        event({ id: "later", day: "2026-09-26", startMs: NOW + 7_200_000 }),
        event({ id: "soon", day: "2026-09-26", startMs: NOW + 1_800_000 }),
        event({ id: "past", day: "2026-09-26", startMs: NOW - 3_600_000 }),
        event({ id: "tomorrow", day: "2026-09-27" }),
        event({ id: "yesterday", day: "2026-09-25" }),
      ],
      { todayKey: "2026-09-26" },
    );

    expect(selected.map((item) => item.id)).toEqual(["past", "soon", "later"]);
  });

  it("returns nothing when today has no events", () => {
    const selected = selectHomeCalendarEvents(
      [event({ id: "monday", day: "2026-09-28" })],
      { todayKey: "2026-09-26" },
    );

    expect(selected).toEqual([]);
  });
});
