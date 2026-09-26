import { describe, expect, it } from "vitest";

import {
  supportCheckoutMode,
  supportPriceKey,
  workspacePriceKey,
  workspaceSeatQuantity,
} from "./catalog";

describe("stripe price catalog", () => {
  it("maps workspace plans to lookup keys", () => {
    expect(workspacePriceKey("free", "month")).toBe("plan_free_month");
    expect(workspacePriceKey("free", "year")).toBe("plan_free_year");
    expect(workspacePriceKey("pro", "month")).toBe("plan_pro_month");
    expect(workspacePriceKey("pro", "year")).toBe("plan_pro_year");
  });

  it("bills Team per seat and Solo as one", () => {
    expect(workspaceSeatQuantity("free", 4)).toBe(1);
    expect(workspaceSeatQuantity("pro", 4)).toBe(4);
  });

  it("splits support one-month payments from subscriptions", () => {
    expect(supportPriceKey("founder", "month")).toBe("support_founder_month");
    expect(supportPriceKey("priority", "subscribe")).toBe(
      "support_priority_subscribe",
    );
    expect(supportCheckoutMode("month")).toBe("payment");
    expect(supportCheckoutMode("subscribe")).toBe("subscription");
  });
});
