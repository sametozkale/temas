import { describe, expect, it } from "vitest";

import {
  monthGrid,
  monthKey,
  parseYearMonth,
  shiftMonth,
  weekDays,
} from "./grid";

describe("calendar grid", () => {
  it("parses and shifts YYYY-MM", () => {
    expect(parseYearMonth("2026-09", new Date("2026-01-01T00:00:00Z"))).toEqual(
      {
        year: 2026,
        month: 9,
      },
    );
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(monthKey(2026, 9)).toBe("2026-09");
  });

  it("builds a Monday-start September 2026 grid", () => {
    const weeks = monthGrid(2026, 9, "Europe/Istanbul");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.[0]?.date).toBe("2026-08-31");
    expect(weeks[0]?.[1]?.date).toBe("2026-09-01");
    expect(weeks[0]?.[1]?.inMonth).toBe(true);
    expect(weeks[4]?.[6]?.date).toBe("2026-10-04");
  });

  it("returns seven ISO dates for a week", () => {
    const days = weekDays("2026-09-12", "Europe/Istanbul");
    expect(days).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]);
  });
});
