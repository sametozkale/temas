import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  GOTRUE_EMAIL_KINDS,
  GOTRUE_OTP_TYPE,
  gotrueCallbackHref,
  gotrueEmailHtml,
} from "./gotrue-email-html";
import { recentAuthEmailCooldown } from "./email-cooldown";
import { authEmailHref, verifySendEmailHookSignature } from "./send-email-hook";

describe("recent auth email cooldown", () => {
  it("treats a short GoTrue wait as a link that was just sent", () => {
    expect(
      recentAuthEmailCooldown({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 7 seconds.",
      }),
    ).toBe(true);
    expect(
      recentAuthEmailCooldown({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 3600 seconds.",
      }),
    ).toBe(false);
    expect(
      recentAuthEmailCooldown({
        status: 429,
        code: "over_request_rate_limit",
        message: "For security purposes, you can only request this after 7 seconds.",
      }),
    ).toBe(false);
  });
});

describe("GoTrue email templates", () => {
  it("link through the app callback with token_hash", () => {
    for (const kind of GOTRUE_EMAIL_KINDS) {
      const html = gotrueEmailHtml(kind);
      const onDisk = readFileSync(
        join(process.cwd(), "supabase/templates", `${kind}.html`),
        "utf8",
      );
      expect(html).toContain(gotrueCallbackHref(GOTRUE_OTP_TYPE[kind]));
      expect(html).not.toContain("{{ .ConfirmationURL }}");
      expect(onDisk).toContain(gotrueCallbackHref(GOTRUE_OTP_TYPE[kind]));
      expect(onDisk).not.toContain("{{ .ConfirmationURL }}");
    }
  });
});

describe("authEmailHref", () => {
  const prev = process.env.APP_URL;

  afterEach(() => {
    process.env.APP_URL = prev;
  });

  it("rewrites a localhost redirect_to to APP_URL", () => {
    process.env.APP_URL = "https://temas-oberyon.vercel.app";
    expect(
      authEmailHref({
        tokenHash: "abc",
        type: "magiclink",
        redirectTo: "http://localhost:3000/auth/callback?next=/home",
      }),
    ).toBe(
      "https://temas-oberyon.vercel.app/auth/callback?token_hash=abc&type=magiclink&next=%2Fhome",
    );
  });
});

describe("verifySendEmailHookSignature", () => {
  it("accepts a matching Standard Webhooks signature", () => {
    const raw = Buffer.from("hook-secret").toString("base64");
    const secret = `v1,whsec_${raw}`;
    const payload = JSON.stringify({ ok: true });
    const id = "msg_1";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const digest = createHmac("sha256", Buffer.from(raw, "base64"))
      .update(`${id}.${timestamp}.${payload}`)
      .digest("base64");
    expect(
      verifySendEmailHookSignature({
        secret,
        payload,
        id,
        timestamp,
        signatureHeader: `v1,${digest}`,
      }),
    ).toBe(true);
  });
});
