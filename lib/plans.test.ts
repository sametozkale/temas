import { describe, expect, it } from "vitest";

import {
  PLANS,
  formatUsd,
  getPlan,
  listingCap,
  parseBillingInterval,
  parsePlanId,
  planCredits,
  planListings,
  planQuote,
} from "./plans";

describe("plans catalog", () => {
  it("treats unknown values as free", () => {
    expect(parsePlanId(undefined)).toBe("free");
    expect(parsePlanId("enterprise")).toBe("free");
    expect(parsePlanId("pro")).toBe("pro");
    expect(parseBillingInterval(undefined)).toBe("month");
    expect(parseBillingInterval("year")).toBe("year");
  });

  it("exposes per-workspace AI quotas", () => {
    expect(planCredits(getPlan("free"))).toBe(500);
    expect(planCredits(getPlan("free"), "year")).toBe(750);
    expect(planCredits(getPlan("pro"))).toBe(750);
    expect(planCredits(getPlan("pro"), "year")).toBe(1000);
    expect(PLANS.free.seats).toBe(1);
    expect(PLANS.pro.seats).toBe(50);
    expect(planListings(PLANS.free, "month").limit).toBe(50);
    expect(planListings(PLANS.free, "year").limit).toBe(100);
    expect(planListings(PLANS.pro, "month")).toEqual({
      limit: 200,
      perSeat: true,
    });
    expect(planListings(PLANS.pro, "year").limit).toBeNull();
    expect(listingCap(PLANS.pro, 3)).toBe(600);
    expect(listingCap(PLANS.pro, 3, "year")).toBeNull();
  });

  it("prices solo flat and team per agent, with a lower annual monthly rate", () => {
    expect(planQuote(PLANS.free, "month")).toEqual({
      monthlyCents: 4900,
      perSeat: false,
      annualCents: null,
    });
    expect(planQuote(PLANS.free, "year").monthlyCents).toBe(2900);
    expect(planQuote(PLANS.free, "year").annualCents).toBe(34800);
    expect(planQuote(PLANS.pro, "month")).toMatchObject({
      monthlyCents: 6900,
      perSeat: true,
    });
    expect(planQuote(PLANS.pro, "year").monthlyCents).toBe(4900);
    expect(planQuote(PLANS.pro, "year").annualCents).toBe(58800);
    expect(formatUsd(4900)).toBe("$49");
  });
});
