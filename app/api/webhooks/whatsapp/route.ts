import { NextResponse, type NextRequest } from "next/server";

import { env, integrations } from "@/lib/env";

/** WhatsApp Cloud API webhook stub — inbound handling lands in PHASE 7. */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token &&
    token === env().META_WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST() {
  if (!integrations.whatsapp()) {
    return NextResponse.json({ ok: true, stub: true });
  }
  return NextResponse.json({ ok: true, stub: true });
}
