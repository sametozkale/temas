import { describe, expect, it } from "vitest";

import { generateSlots } from "./generate";
import type { DayWindows, SlotEngineInput } from "./types";

const TZ = "Europe/Istanbul";
const DAY = "2026-09-14"; // Monday

function day(
  windows: { start: number; end: number }[],
  date = DAY,
): DayWindows {
  return {
    date,
    windows: windows.map((w) => ({
      startMin: w.start * 60,
      endMin: w.end * 60,
    })),
  };
}

function input(
  overrides: Partial<SlotEngineInput> &
    Pick<SlotEngineInput, "participantSets">,
): SlotEngineInput {
  return {
    timezone: TZ,
    horizonStart: new Date("2026-09-14T00:00:00+03:00"),
    horizonEnd: new Date("2026-09-15T00:00:00+03:00"),
    slotDurationMin: 30,
    bufferMin: 15,
    existingBooked: [],
    minNoticeHours: 0,
    now: new Date("2026-09-13T12:00:00Z"),
    ...overrides,
  };
}

function hours(slotStart: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(slotStart);
}

describe("generateSlots (docs/04 §5)", () => {
  it("produces no slot when agent 09–17 and tenant 17–20 only touch at 17:00", () => {
    const slots = generateSlots(
      input({
        participantSets: [
          [day([{ start: 9, end: 17 }])],
          [day([{ start: 17, end: 20 }])],
        ],
      }),
    );
    expect(slots).toEqual([]);
  });

  it("tiles a full overlap onto a 30+15 grid", () => {
    const slots = generateSlots(
      input({
        participantSets: [
          [day([{ start: 9, end: 17 }])],
          [day([{ start: 9, end: 17 }])],
        ],
      }),
    );
    expect(slots.map((s) => hours(s.startsAt))).toEqual([
      "09:00",
      "09:45",
      "10:30",
      "11:15",
      "12:00",
      "12:45",
      "13:30",
      "14:15",
      "15:00",
      "15:45",
      "16:30",
    ]);
    expect(slots[0]!.endsAt.getTime() - slots[0]!.startsAt.getTime()).toBe(
      30 * 60_000,
    );
  });

  it("keeps only the overlapping hour on a partial overlap", () => {
    const slots = generateSlots(
      input({
        participantSets: [
          [day([{ start: 9, end: 17 }])],
          [day([{ start: 16, end: 20 }])],
        ],
      }),
    );
    expect(slots.map((s) => hours(s.startsAt))).toEqual(["16:00"]);
  });

  it("ORs two participants in the same set", () => {
    const slots = generateSlots(
      input({
        participantSets: [
          [day([{ start: 9, end: 12 }]), day([{ start: 17, end: 20 }])],
          [day([{ start: 10, end: 18 }])],
        ],
      }),
    );
    expect(slots.map((s) => hours(s.startsAt))).toEqual([
      "10:00",
      "10:45",
      "11:30",
      "17:00",
    ]);
  });

  it("drops slots inside min_notice_hours", () => {
    const slots = generateSlots(
      input({
        participantSets: [[day([{ start: 9, end: 17 }])]],
        minNoticeHours: 3,
        now: new Date("2026-09-14T08:00:00+03:00"),
      }),
    );
    expect(slots.map((s) => hours(s.startsAt))[0]).toBe("11:15");
    expect(
      slots.every((s) => s.startsAt >= new Date("2026-09-14T11:00:00+03:00")),
    ).toBe(true);
  });

  it("skips slots that overlap an existing booking", () => {
    const slots = generateSlots(
      input({
        participantSets: [[day([{ start: 9, end: 12 }])]],
        existingBooked: [
          {
            startsAt: new Date("2026-09-14T09:45:00+03:00"),
            endsAt: new Date("2026-09-14T10:15:00+03:00"),
          },
        ],
      }),
    );
    expect(slots.map((s) => hours(s.startsAt))).toEqual([
      "09:00",
      "10:30",
      "11:15",
    ]);
  });

  it("drops a leftover that cannot fit a full slot plus buffer", () => {
    const slots = generateSlots(
      input({
        slotDurationMin: 30,
        bufferMin: 15,
        participantSets: [[day([{ start: 9, end: 9 + 50 / 60 }])]],
      }),
    );
    expect(slots.map((s) => hours(s.startsAt))).toEqual(["09:00"]);
  });

  it("skips a day when any required set has no windows", () => {
    const slots = generateSlots(
      input({
        participantSets: [
          [day([{ start: 9, end: 17 }])],
          [{ date: DAY, windows: [] }],
        ],
      }),
    );
    expect(slots).toEqual([]);
  });
});
