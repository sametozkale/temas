import { NextResponse, type NextRequest } from "next/server";

import { clientIpFromHeaders } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * Ack Resend delivery events. docs/03 has no delivery-events table, so
 * payloads are not persisted — keep 200 so Resend does not retry.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const limit = await consumeRateLimit(`webhook:resend:${ip}`, 120, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}
