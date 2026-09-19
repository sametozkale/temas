import { describe, expect, it } from "vitest";

import { resolveFeedbackInbox } from "./inbox";

describe("resolveFeedbackInbox", () => {
  it("uses FEEDBACK_TO when set", () => {
    expect(
      resolveFeedbackInbox({
        configured: "owner@temas.test",
        nodeEnv: "production",
        resendConfigured: true,
      }),
    ).toBe("owner@temas.test");
  });

  it("falls back to Mailpit only when Resend is off", () => {
    expect(
      resolveFeedbackInbox({
        nodeEnv: "development",
        resendConfigured: false,
      }),
    ).toBe("feedback@localhost");
    expect(
      resolveFeedbackInbox({
        nodeEnv: "development",
        resendConfigured: true,
      }),
    ).toBeNull();
    expect(
      resolveFeedbackInbox({
        nodeEnv: "production",
        resendConfigured: false,
      }),
    ).toBeNull();
  });
});
