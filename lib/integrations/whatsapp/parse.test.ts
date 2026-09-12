import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { parseWhatsAppPayload, verifyWhatsAppSignature } from "./parse";

describe("WhatsApp webhook parse", () => {
  it("extracts inbound text messages", () => {
    const rows = parseWhatsAppPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123" },
                contacts: [
                  { wa_id: "905321110000", profile: { name: "Elif Kaya" } },
                ],
                messages: [
                  {
                    from: "905321110000",
                    id: "wamid.1",
                    timestamp: "1789227600",
                    type: "text",
                    text: { body: "Is the Kadıköy flat still available?" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      phoneNumberId: "123",
      from: "905321110000",
      profileName: "Elif Kaya",
      body: "Is the Kadıköy flat still available?",
      externalId: "wamid.1",
    });
  });

  it("verifies HMAC signatures and skips when no secret", () => {
    const raw = '{"ok":true}';
    expect(verifyWhatsAppSignature(raw, "sha256=x", undefined)).toBe(true);
    const digest = createHmac("sha256", "secret").update(raw).digest("hex");
    expect(verifyWhatsAppSignature(raw, `sha256=${digest}`, "secret")).toBe(
      true,
    );
    expect(verifyWhatsAppSignature(raw, "sha256=deadbeef", "secret")).toBe(
      false,
    );
  });
});
