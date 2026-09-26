import { NextResponse } from "next/server";

import { applyBillingGrant } from "@/lib/billing/apply";
import { applyStripeEvent, type StripeEvent } from "@/lib/billing/events";
import { verifyStripeSignature } from "@/lib/billing/signature";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** Stripe webhook. Stays off until STRIPE_WEBHOOK_SECRET is set. */
export async function POST(req: Request) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const payload = await req.text();
  const header = req.headers.get("stripe-signature");
  if (!header || !verifyStripeSignature(payload, header, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const grant = applyStripeEvent(event);
  if (grant) await applyBillingGrant(db, grant);
  return NextResponse.json({ received: true });
}
