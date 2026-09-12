import { describe, expect, it } from "vitest";

import { applyExceptions, expandRRule } from "./rrule";
import { wallClockToUtc } from "./time";

describe("expandRRule", () => {
  it("emits weekly BYDAY windows in the property timezone", () => {
    const days = expandRRule(
      {
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE",
        timezone: "Europe/Istanbul",
        startMin: 17 * 60,
        endMin: 20 * 60,
      },
      new Date("2026-09-14T00:00:00+03:00"),
      new Date("2026-09-18T00:00:00+03:00"),
    );
    expect(days.map((d) => d.date)).toEqual(["2026-09-14", "2026-09-16"]);
    expect(days[0]?.windows).toEqual([{ startMin: 17 * 60, endMin: 20 * 60 }]);
  });

  it("matches DAILY rrules and ignores inverted start/end", () => {
    const days = expandRRule(
      {
        rrule: "FREQ=DAILY",
        timezone: "Europe/Istanbul",
        startMin: 10 * 60,
        endMin: 11 * 60,
      },
      new Date("2026-09-14T00:00:00+03:00"),
      new Date("2026-09-16T00:00:00+03:00"),
    );
    expect(days.map((d) => d.date)).toEqual(["2026-09-14", "2026-09-15"]);

    expect(
      expandRRule(
        {
          rrule: "FREQ=DAILY",
          timezone: "Europe/Istanbul",
          startMin: 12 * 60,
          endMin: 10 * 60,
        },
        new Date("2026-09-14T00:00:00+03:00"),
        new Date("2026-09-15T00:00:00+03:00"),
      ),
    ).toEqual([]);
  });

  it("respects effective_from / effective_until", () => {
    const days = expandRRule(
      {
        rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        timezone: "Europe/Istanbul",
        startMin: 9 * 60,
        endMin: 17 * 60,
        effectiveFrom: "2026-09-16",
        effectiveUntil: "2026-09-17",
      },
      new Date("2026-09-14T00:00:00+03:00"),
      new Date("2026-09-19T00:00:00+03:00"),
    );
    expect(days.map((d) => d.date)).toEqual(["2026-09-16", "2026-09-17"]);
  });

  it("keeps wall-clock 17:00 across a DST spring-forward in America/New_York", () => {
    // 2026-03-08 02:00 EST → 03:00 EDT.
    const days = expandRRule(
      {
        rrule: "FREQ=WEEKLY;BYDAY=SA",
        timezone: "America/New_York",
        startMin: 17 * 60,
        endMin: 18 * 60,
      },
      new Date("2026-03-07T00:00:00-05:00"),
      new Date("2026-03-15T00:00:00-04:00"),
    );
    expect(days.map((d) => d.date)).toEqual(["2026-03-07", "2026-03-14"]);

    const before = wallClockToUtc("2026-03-07", 17 * 60, "America/New_York");
    const after = wallClockToUtc("2026-03-14", 17 * 60, "America/New_York");
    expect(before.toISOString()).toBe("2026-03-07T22:00:00.000Z"); // EST = UTC−5
    expect(after.toISOString()).toBe("2026-03-14T21:00:00.000Z"); // EDT = UTC−4
  });
});

describe("applyExceptions", () => {
  const base = [
    {
      date: "2026-09-14",
      windows: [{ startMin: 9 * 60, endMin: 17 * 60 }],
    },
    {
      date: "2026-09-15",
      windows: [{ startMin: 9 * 60, endMin: 17 * 60 }],
    },
  ];

  it("removes a blocked day", () => {
    expect(
      applyExceptions(base, [{ date: "2026-09-14", kind: "block" }]).map(
        (d) => d.date,
      ),
    ).toEqual(["2026-09-15"]);
  });

  it("replaces the window on an override day", () => {
    const days = applyExceptions(base, [
      {
        date: "2026-09-14",
        kind: "override",
        startMin: 18 * 60,
        endMin: 20 * 60,
      },
    ]);
    expect(days.find((d) => d.date === "2026-09-14")?.windows).toEqual([
      { startMin: 18 * 60, endMin: 20 * 60 },
    ]);
  });

  it("adds an override for a day that had no recurrence", () => {
    const days = applyExceptions(base, [
      {
        date: "2026-09-16",
        kind: "override",
        startMin: 10 * 60,
        endMin: 12 * 60,
      },
    ]);
    expect(days.find((d) => d.date === "2026-09-16")?.windows).toEqual([
      { startMin: 10 * 60, endMin: 12 * 60 },
    ]);
  });
});
