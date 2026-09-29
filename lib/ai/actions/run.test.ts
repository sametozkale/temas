import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/activity", () => ({
  withActivityOrigin: (_origin: unknown, fn: () => unknown) => fn(),
}));

import { ForbiddenError } from "@/lib/permissions";

import { WRITE_LIMIT_PER_TURN, write, type ActionScope } from "./run";

function scope(): ActionScope {
  return {
    ctx: {} as ActionScope["ctx"],
    threadId: "t",
    files: [],
    writes: { count: 0 },
    charges: { listingImport: 0 },
  };
}

describe("write", () => {
  it("turns a permission error into a forbidden card", async () => {
    const out = await write(scope(), async () => {
      throw new ForbiddenError("calendar.manage");
    });
    expect(out).toEqual({ ok: false, error: "forbidden" });
  });

  it("stops after the per-turn write limit", async () => {
    const s = scope();
    for (let i = 0; i < WRITE_LIMIT_PER_TURN; i += 1) {
      await write(s, async () => ({ ok: true, summary: "ok" }));
    }
    const out = await write(s, async () => ({ ok: true, summary: "ok" }));
    expect(out).toMatchObject({ ok: false, error: "limit_reached" });
  });
});
