import { describe, expect, it } from "vitest";

import {
  SUPPORT_WHATSAPP_E164,
  supportWhatsappUrl,
} from "./support-whatsapp";
import {
  SUPPORT_EMAIL,
  parseSupportPlan,
  supportHasWhatsapp,
  supportMailto,
} from "./support";

describe("support plans", () => {
  it("falls back to included", () => {
    expect(parseSupportPlan(null)).toBe("included");
    expect(parseSupportPlan("nope")).toBe("included");
    expect(parseSupportPlan("priority")).toBe("priority");
  });

  it("opens WhatsApp on Founder and Priority", () => {
    expect(supportHasWhatsapp("included")).toBe(false);
    expect(supportHasWhatsapp("founder")).toBe(true);
    expect(supportHasWhatsapp("priority")).toBe(true);
  });

  it("builds the founder contact links", () => {
    expect(supportMailto()).toBe(
      `mailto:${SUPPORT_EMAIL}?subject=Temas%20support`,
    );
    expect(supportWhatsappUrl()).toContain(
      `https://wa.me/${SUPPORT_WHATSAPP_E164.slice(1)}`,
    );
  });
});
