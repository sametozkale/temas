import { describe, expect, it } from "vitest";

import { allDayKeys } from "@/lib/calendar/google";
import { presentGoogleSwatches } from "@/lib/calendar/google-palette";
import { namedEventTone } from "@/lib/calendar/event-tone";
import {
  canColorGoogleEvents,
  googleIncludesCalendar,
  hasCalendarScope,
  resolveGoogleEventColor,
  safeGoogleColor,
} from "@/lib/integrations/google/calendar";

describe("hasCalendarScope", () => {
  it("accepts a calendar scope alongside gmail", () => {
    expect(
      hasCalendarScope(
        "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
      ),
    ).toBe(true);
  });

  it("rejects a gmail-only grant", () => {
    expect(
      hasCalendarScope("https://www.googleapis.com/auth/gmail.modify"),
    ).toBe(false);
    expect(hasCalendarScope(undefined)).toBe(false);
  });
});

describe("resolveGoogleEventColor", () => {
  it("prefers the Google label colour over the legacy colour id", () => {
    const labels = new Map([["label-1", "#ad1457"]]);
    const colors = new Map([["8", "#e1e1e1"]]);
    expect(resolveGoogleEventColor("label-1", "8", labels, colors)).toEqual({
      color: "#ad1457",
      swatchId: "label-1",
    });
    expect(resolveGoogleEventColor(null, "8", labels, colors)).toEqual({
      color: "#e1e1e1",
      swatchId: "8",
    });
    expect(resolveGoogleEventColor(null, null, labels, colors).color).toBeNull();
  });
});

describe("canColorGoogleEvents", () => {
  it("allows the events scope and refuses read-only", () => {
    expect(
      canColorGoogleEvents("https://www.googleapis.com/auth/calendar.events"),
    ).toBe(true);
    expect(
      canColorGoogleEvents("https://www.googleapis.com/auth/calendar.readonly"),
    ).toBe(false);
  });
});

describe("googleIncludesCalendar", () => {
  it("treats a dev mailbox as without calendar", () => {
    expect(
      googleIncludesCalendar({
        mode: "dev",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
      }),
    ).toBe(false);
    expect(
      googleIncludesCalendar({
        mode: "oauth",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
      }),
    ).toBe(true);
  });
});

describe("allDayKeys", () => {
  it("treats the Google end date as exclusive", () => {
    expect(allDayKeys("2026-09-26", "2026-09-28")).toEqual([
      "2026-09-26",
      "2026-09-27",
    ]);
  });
});

describe("presentGoogleSwatches", () => {
  it("uses Google's names and keeps similar colours together", () => {
    const swatches = presentGoogleSwatches([
      { id: "a", color: "#616161" },
      { id: "b", color: "#ad1457" },
      { id: "c", color: "#e67c73", name: "Custom flamingo" },
    ]);
    expect(swatches.map((swatch) => swatch.name)).toEqual([
      "Radicchio",
      "Graphite",
      "Custom flamingo",
    ]);
    expect(swatches[0]?.color).toBe("#ad1457");
  });
});

describe("event colour", () => {
  it("keeps the same title on the same tone", () => {
    expect(namedEventTone("Kitap Oku")).toBe(namedEventTone("kitap oku"));
    expect(namedEventTone("Yemek")).toBe(namedEventTone("Yemek"));
  });

  it("accepts only a Google hex colour", () => {
    expect(safeGoogleColor("#039be5")).toBe("#039be5");
    expect(safeGoogleColor("red")).toBeNull();
  });
});
