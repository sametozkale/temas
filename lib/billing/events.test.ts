import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { applyStripeEvent } from "./events";
import { verifyStripeSignature } from "./signature";

const NOW = Date.parse("2026-09-26T12:00:00.000Z");

describe("stripe events", () => {
  it("grants a yearly Team subscription from checkout", () => {
    const grant = applyStripeEvent(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "subscription",
            customer: "cus_1",
            subscription: "sub_1",
            metadata: {
              kind: "workspace",
              workspace_id: "ws",
              plan: "pro",
              interval: "year",
            },
          },
        },
      },
      NOW,
    );
    expect(grant).toMatchObject({
      kind: "workspace",
      workspaceId: "ws",
      plan: "pro",
      interval: "year",
      status: "active",
      subscriptionId: "sub_1",
    });
  });

  it("grants a one-month support purchase", () => {
    const grant = applyStripeEvent(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "payment",
            customer: "cus_2",
            metadata: {
              kind: "support",
              user_id: "user",
              support_plan: "priority",
            },
          },
        },
      },
      NOW,
    );
    expect(grant).toMatchObject({
      kind: "support",
      userId: "user",
      plan: "priority",
      billing: "month",
    });
    expect(grant && grant.kind === "support" && grant.periodEndsAt).toBe(
      new Date(NOW + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("clears a canceled support subscription", () => {
    const grant = applyStripeEvent({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_9",
          metadata: { kind: "support", user_id: "user", support_plan: "founder" },
        },
      },
    });
    expect(grant).toMatchObject({
      plan: "included",
      billing: "none",
      subscriptionId: null,
      periodEndsAt: null,
    });
  });

  it("marks a past-due workspace without changing the plan", () => {
    const grant = applyStripeEvent({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_3",
          status: "past_due",
          customer: "cus_3",
          metadata: {
            kind: "workspace",
            workspace_id: "ws",
            plan: "free",
            interval: "month",
          },
        },
      },
    });
    expect(grant).toMatchObject({
      plan: "free",
      status: "past_due",
      subscriptionId: "sub_3",
    });
  });
});

describe("stripe signature", () => {
  it("accepts a fresh v1 signature", () => {
    const payload = "{\"id\":\"evt_1\"}";
    const secret = "whsec_" + Buffer.from("test-secret").toString("base64");
    const t = Math.floor(NOW / 1000);
    const v1 = createHmac("sha256", Buffer.from("test-secret"))
      .update(`${t}.${payload}`)
      .digest("hex");
    expect(
      verifyStripeSignature(payload, `t=${t},v1=${v1}`, secret, NOW),
    ).toBe(true);
    expect(
      verifyStripeSignature(payload, `t=${t},v1=deadbeef`, secret, NOW),
    ).toBe(false);
  });
});
