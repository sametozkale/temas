import { describe, expect, it } from "vitest";

import { PLANS, getPlan, parsePlanId } from "./plans";

describe("plans catalog", () => {
  it("treats unknown values as free", () => {
    expect(parsePlanId(undefined)).toBe("free");
    expect(parsePlanId("enterprise")).toBe("free");
    expect(parsePlanId("pro")).toBe("pro");
  });

  it("exposes per-workspace AI quotas", () => {
    expect(getPlan("free").aiMessagesPerMonth).toBe(100);
    expect(getPlan("pro").aiMessagesPerMonth).toBe(2000);
    expect(PLANS.free.seats).toBeLessThan(PLANS.pro.seats);
  });
});
