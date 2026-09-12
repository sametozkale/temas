import { describe, expect, it } from "vitest";

import { monthRange, selectAskTools } from "./intent";

describe("selectAskTools", () => {
  it("picks listViewings for the monthly viewing question", () => {
    expect(selectAskTools("How many viewings this month?")).toContain(
      "listViewings",
    );
  });
});

describe("monthRange", () => {
  it("uses the workspace timezone wall clock for September 2026 in Istanbul", () => {
    const range = monthRange(
      "Europe/Istanbul",
      new Date("2026-09-12T12:00:00.000Z"),
    );
    expect(range.year).toBe(2026);
    expect(range.month).toBe(9);
    expect(range.start.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-30T21:00:00.000Z");
  });
});
