import { describe, expect, it } from "vitest";

import { createWhatsAppPairToken, verifyWhatsAppPairToken } from "./pair";

const userId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";

describe("WhatsApp pair token", () => {
  it("round-trips a signed payload", () => {
    const token = createWhatsAppPairToken(userId, workspaceId);
    expect(verifyWhatsAppPairToken(token)).toEqual({
      u: userId,
      w: workspaceId,
      e: expect.any(Number),
    });
  });

  it("rejects a tampered token", () => {
    const token = createWhatsAppPairToken(userId, workspaceId);
    expect(verifyWhatsAppPairToken(`${token}x`)).toBeNull();
    expect(verifyWhatsAppPairToken("not-a-token")).toBeNull();
  });
});
