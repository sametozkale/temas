import { describe, expect, it } from "vitest";

import { intersectAll, overlapsAny, tile, unionWindows } from "./windows";

describe("unionWindows", () => {
  it("merges overlapping and adjacent half-open windows", () => {
    expect(
      unionWindows([
        { startMin: 60, endMin: 120 },
        { startMin: 90, endMin: 180 },
        { startMin: 180, endMin: 240 },
      ]),
    ).toEqual([{ startMin: 60, endMin: 240 }]);
  });

  it("keeps disjoint windows sorted", () => {
    expect(
      unionWindows([
        { startMin: 600, endMin: 720 },
        { startMin: 0, endMin: 60 },
      ]),
    ).toEqual([
      { startMin: 0, endMin: 60 },
      { startMin: 600, endMin: 720 },
    ]);
  });

  it("drops empty and inverted windows", () => {
    expect(
      unionWindows([
        { startMin: 10, endMin: 10 },
        { startMin: 20, endMin: 15 },
      ]),
    ).toEqual([]);
  });
});

describe("intersectAll (docs/04 §5)", () => {
  it("treats [start, end) as half-open: 09–17 ∩ 17–20 is empty", () => {
    expect(
      intersectAll([
        [{ startMin: 9 * 60, endMin: 17 * 60 }],
        [{ startMin: 17 * 60, endMin: 20 * 60 }],
      ]),
    ).toEqual([]);
  });

  it("returns the overlap of two partial windows", () => {
    expect(
      intersectAll([
        [{ startMin: 9 * 60, endMin: 17 * 60 }],
        [{ startMin: 16 * 60, endMin: 20 * 60 }],
      ]),
    ).toEqual([{ startMin: 16 * 60, endMin: 17 * 60 }]);
  });

  it("unions inside each set before intersecting across sets", () => {
    // One agent mornings, another evenings; tenant 10–18.
    const agent = [
      { startMin: 9 * 60, endMin: 12 * 60 },
      { startMin: 17 * 60, endMin: 20 * 60 },
    ];
    const tenant = [{ startMin: 10 * 60, endMin: 18 * 60 }];
    expect(intersectAll([agent, tenant])).toEqual([
      { startMin: 10 * 60, endMin: 12 * 60 },
      { startMin: 17 * 60, endMin: 18 * 60 },
    ]);
  });

  it("yields nothing when any set is empty", () => {
    expect(intersectAll([[{ startMin: 0, endMin: 60 }], []])).toEqual([]);
  });
});

describe("tile", () => {
  it("steps by duration+buffer and drops a leftover that cannot fit", () => {
    // 09:00–09:50, 30 min slot + 15 min buffer → one slot, 20 min leftover dropped.
    expect(tile({ startMin: 9 * 60, endMin: 9 * 60 + 50 }, 45, 30)).toEqual([
      { startMin: 9 * 60, endMin: 9 * 60 + 30 },
    ]);
  });

  it("fills an exact multiple of the step", () => {
    expect(tile({ startMin: 0, endMin: 90 }, 45, 30)).toEqual([
      { startMin: 0, endMin: 30 },
      { startMin: 45, endMin: 75 },
    ]);
  });
});

describe("overlapsAny", () => {
  const slot = {
    startsAt: new Date("2026-09-14T06:00:00Z"),
    endsAt: new Date("2026-09-14T06:30:00Z"),
  };

  it("detects half-open overlap", () => {
    expect(
      overlapsAny(slot, [
        {
          startsAt: new Date("2026-09-14T06:15:00Z"),
          endsAt: new Date("2026-09-14T07:00:00Z"),
        },
      ]),
    ).toBe(true);
  });

  it("allows touching at the boundary", () => {
    expect(
      overlapsAny(slot, [
        {
          startsAt: new Date("2026-09-14T06:30:00Z"),
          endsAt: new Date("2026-09-14T07:00:00Z"),
        },
      ]),
    ).toBe(false);
  });
});
