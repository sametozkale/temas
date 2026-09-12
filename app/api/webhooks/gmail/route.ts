import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { enqueueInboxSync } from "@/lib/inbox/enqueue";

function decodePayload(data: string) {
  const json = Buffer.from(data, "base64url").toString("utf8");
  return JSON.parse(json) as { emailAddress?: string; historyId?: string };
}

/**
 * Gmail users.watch → Cloud Pub/Sub push. Always 200 so Google does not retry
 * forever on unknown mailboxes. Sync is enqueued; credentials stay on the
 * system client.
 */
export async function POST(request: NextRequest) {
  let body: { message?: { data?: string } };
  try {
    body = (await request.json()) as { message?: { data?: string } };
  } catch {
    return NextResponse.json({ ok: true });
  }
  const data = body.message?.data;
  if (!data) return NextResponse.json({ ok: true });

  let email: string | undefined;
  try {
    email = decodePayload(data).emailAddress?.toLowerCase();
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (!email) return NextResponse.json({ ok: true });

  const [row] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.externalId, email))
    .limit(1);
  if (row) await enqueueInboxSync({ integrationId: row.id });
  return NextResponse.json({ ok: true });
}
