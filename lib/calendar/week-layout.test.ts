import { describe, expect, it } from "vitest";

import { eventBlockPx, placeTimedEvents } from "@/lib/calendar/week-layout";

describe("eventBlockPx", () => {
  it("scales with duration the way an hour row does", () => {
    expect(eventBlockPx(12 * 60, 12 * 60 + 30)).toBe(24);
    expect(eventBlockPx(12 * 60, 14 * 60)).toBe(96);
    expect(eventBlockPx(0, 120) / eventBlockPx(0, 30)).toBe(4);
  });
});

describe("placeTimedEvents", () => {
  it("puts overlapping spans side by side and leaves a gap in its own column", () => {
    const placed = placeTimedEvents([
      { key: "long", start: 12 * 60, end: 14 * 60 },
      { key: "short", start: 12 * 60 + 30, end: 13 * 60 },
      { key: "later", start: 15 * 60, end: 16 * 60 },
    ]);
    const long = placed.find((item) => item.key === "long");
    const short = placed.find((item) => item.key === "short");
    const later = placed.find((item) => item.key === "later");
    expect(long).toMatchObject({ column: 0, columns: 2, height: 96 });
    expect(short).toMatchObject({ column: 1, columns: 2, height: 24 });
    expect(later).toMatchObject({ column: 0, columns: 1, height: 48 });
  });
});
