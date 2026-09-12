import { describe, expect, it } from "vitest";

import {
  civilDate,
  eachDay,
  minutesToTime,
  parseTimeToMinutes,
  wallClockToUtc,
} from "./time";

describe("time helpers", () => {
  it("parses and formats HH:MM", () => {
    expect(parseTimeToMinutes("09:30:00")).toBe(9 * 60 + 30);
    expect(parseTimeToMinutes("17:00")).toBe(17 * 60);
    expect(minutesToTime(9 * 60 + 5)).toBe("09:05");
  });

  it("lists exclusive-horizon civil days", () => {
    expect(
      eachDay(
        new Date("2026-09-14T00:00:00+03:00"),
        new Date("2026-09-16T00:00:00+03:00"),
        "Europe/Istanbul",
      ),
    ).toEqual(["2026-09-14", "2026-09-15"]);
  });

  it("converts wall-clock minutes to UTC", () => {
    const utc = wallClockToUtc("2026-09-14", 17 * 60, "Europe/Istanbul");
    expect(utc.toISOString()).toBe("2026-09-14T14:00:00.000Z");
    expect(civilDate(utc, "Europe/Istanbul")).toBe("2026-09-14");
  });
});
