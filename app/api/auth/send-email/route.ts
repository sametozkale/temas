import { NextResponse, type NextRequest } from "next/server";

import { deliverAuthEmail } from "@/lib/auth/deliver-auth-email";
import {
  verifySendEmailHookSignature,
  type SendEmailHookPayload,
} from "@/lib/auth/send-email-hook";
import { env } from "@/lib/env";
import { clientIpFromHeaders } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * Supabase Auth "Send Email" hook. Builds token_hash links on the public
 * APP_URL so production mail never inherits a leftover localhost Site URL.
 */
export async function POST(request: NextRequest) {
  const secret = env().SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const limit = await consumeRateLimit(
    `webhook:auth-email:${ip}`,
    60,
    60 * 1000,
  );
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const payload = await request.text();
  const ok = verifySendEmailHookSignature({
    secret,
    payload,
    id: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    signatureHeader: request.headers.get("webhook-signature") ?? "",
  });
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SendEmailHookPayload;
  try {
    body = JSON.parse(payload) as SendEmailHookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    await deliverAuthEmail(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "send_failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }

  return NextResponse.json({});
}
