import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { env, integrations as integrationFlags } from "@/lib/env";
import { clientIpFromHeaders } from "@/lib/http";
import { ingestInboundWhatsApp } from "@/lib/inbox/ingest-whatsapp";
import {
  parseWhatsAppPayload,
  verifyWhatsAppSignature,
} from "@/lib/integrations/whatsapp/parse";
import { consumeRateLimit } from "@/lib/rate-limit";

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

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const limit = await consumeRateLimit(
    `webhook:whatsapp:${ip}`,
    120,
    60 * 1000,
  );
  if (!limit.ok) {
    return NextResponse.json({ ok: true, rate_limited: true });
  }

  const raw = await request.text();
  if (
    !verifyWhatsAppSignature(
      raw,
      request.headers.get("x-hub-signature-256"),
      env().META_WHATSAPP_APP_SECRET,
    )
  ) {
    return new NextResponse("forbidden", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const inbound = parseWhatsAppPayload(payload);
  for (const message of inbound) {
    const where = [
      eq(integrations.kind, "whatsapp"),
      eq(integrations.status, "connected"),
    ];
    if (message.phoneNumberId) {
      where.push(eq(integrations.externalId, message.phoneNumberId));
    }
    const [integration] = await db
      .select({
        id: integrations.id,
        userId: integrations.userId,
        workspaceId: integrations.workspaceId,
      })
      .from(integrations)
      .where(and(...where))
      .limit(1);
    if (!integration) continue;
    await ingestInboundWhatsApp({
      userId: integration.userId,
      homeWorkspaceId: integration.workspaceId,
      integrationId: integration.id,
      from: message.from,
      profileName: message.profileName,
      body: message.body,
      externalId: message.externalId,
      sentAt: message.sentAt,
    });
  }

  return NextResponse.json({
    ok: true,
    stub: !integrationFlags.whatsapp(),
  });
}
