import { describe, expect, it } from "vitest";

import { diffSlots } from "./diff";

const t = (hour: number, min = 0) =>
  new Date(
    `2026-09-14T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`,
  );

describe("diffSlots (docs/04 §3, §5 rematerialization)", () => {
  const generated = [
    { startsAt: t(9), endsAt: t(9, 30) },
    { startsAt: t(10), endsAt: t(10, 30) },
  ];

  it("inserts slots that are not yet stored", () => {
    const diff = diffSlots(generated, []);
    expect(diff.insert).toHaveLength(2);
    expect(diff.cancelIds).toEqual([]);
    expect(diff.blockIds).toEqual([]);
  });

  it("is idempotent: a second pass against the same rows is empty", () => {
    const existing = generated.map((s, i) => ({
      id: `id-${i}`,
      startsAt: s.startsAt,
      status: "open" as const,
    }));
    const first = diffSlots(generated, existing);
    expect(first.insert).toEqual([]);
    expect(first.cancelIds).toEqual([]);
    const second = diffSlots(generated, existing);
    expect(second).toEqual({ insert: [], cancelIds: [], blockIds: [] });
  });

  it("cancels open slots that fell out of the generated set", () => {
    const diff = diffSlots(
      [generated[0]!],
      [
        { id: "keep", startsAt: t(9), status: "open" },
        { id: "gone", startsAt: t(10), status: "open" },
      ],
    );
    expect(diff.cancelIds).toEqual(["gone"]);
    expect(diff.insert).toEqual([]);
  });

  it("does not delete booked slots; marks them blocked when the window shrinks", () => {
    const diff = diffSlots(
      [generated[0]!],
      [
        { id: "booked", startsAt: t(10), status: "booked" },
        { id: "blocked", startsAt: t(11), status: "blocked" },
      ],
    );
    expect(diff.cancelIds).toEqual([]);
    expect(diff.blockIds).toEqual(["booked"]);
  });

  it("leaves booked slots that are still generated untouched", () => {
    const diff = diffSlots(generated, [
      { id: "booked", startsAt: t(9), status: "booked" },
    ]);
    expect(diff.insert).toHaveLength(1);
    expect(diff.blockIds).toEqual([]);
    expect(diff.cancelIds).toEqual([]);
  });
});
