import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { logActivity } from "@/lib/activity";
import { publicAppUrl } from "@/lib/app-url";
import { getMembership, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { exchangeCode } from "@/lib/integrations/gmail/oauth";
import {
  gmailProfile,
  type GmailCredentials,
} from "@/lib/integrations/gmail/client";
import {
  enableGmailWatch,
  syncGmailIntegration,
} from "@/lib/integrations/gmail/sync";
import { requireAbility } from "@/lib/permissions";

import { GMAIL_OAUTH_COOKIE, LEGACY_GMAIL_OAUTH_COOKIE } from "../start/route";

async function settingsUrl(query?: string) {
  const url = new URL("/settings/integrations/gmail", await publicAppUrl());
  if (query) url.search = query;
  return url;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", await publicAppUrl()));
  }

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const raw =
    jar.get(GMAIL_OAUTH_COOKIE)?.value ??
    jar.get(LEGACY_GMAIL_OAUTH_COOKIE)?.value;
  jar.delete(GMAIL_OAUTH_COOKIE);
  jar.delete(LEGACY_GMAIL_OAUTH_COOKIE);

  if (error || !code || !state || !raw) {
    return NextResponse.redirect(await settingsUrl("error=gmail_denied"));
  }

  let payload: { state: string; workspaceId: string };
  try {
    payload = JSON.parse(raw) as { state: string; workspaceId: string };
  } catch {
    return NextResponse.redirect(await settingsUrl("error=gmail_denied"));
  }
  if (payload.state !== state) {
    return NextResponse.redirect(await settingsUrl("error=gmail_denied"));
  }

  const membership = await getMembership(user.id, payload.workspaceId);
  if (!membership) {
    return NextResponse.redirect(await settingsUrl("error=gmail_denied"));
  }
  try {
    requireAbility(membership, "integrations.manage");
  } catch {
    return NextResponse.redirect(await settingsUrl("error=gmail_denied"));
  }

  const tokens = await exchangeCode(code);
  const credentials: GmailCredentials = {
    mode: "oauth",
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
  if (!credentials.refreshToken) {
    const [existing] = await db
      .select({ credentials: integrations.credentials })
      .from(integrations)
      .where(
        and(eq(integrations.userId, user.id), eq(integrations.kind, "gmail")),
      )
      .limit(1);
    const prior = existing?.credentials as GmailCredentials | undefined;
    credentials.refreshToken = prior?.refreshToken;
  }
  if (!credentials.refreshToken) {
    return NextResponse.redirect(await settingsUrl("error=gmail_denied"));
  }

  const profile = await gmailProfile(credentials);

  const [upserted] = await db
    .insert(integrations)
    .values({
      userId: user.id,
      workspaceId: payload.workspaceId,
      kind: "gmail",
      status: "connected",
      credentials,
      externalId: profile.emailAddress.toLowerCase(),
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.kind],
      set: {
        workspaceId: payload.workspaceId,
        status: "connected",
        credentials,
        externalId: profile.emailAddress.toLowerCase(),
      },
    })
    .returning({ id: integrations.id });

  await logActivity({
    workspaceId: payload.workspaceId,
    actorId: user.id,
    action: "integration.connected",
    entity: "integration",
    entityId: upserted!.id,
    data: { kind: "gmail", email: profile.emailAddress },
  });

  try {
    await syncGmailIntegration(upserted!.id);
  } catch {
    // Connected either way. Opening Inbox retries the INBOX import.
  }
  try {
    await enableGmailWatch(upserted!.id);
  } catch {
    // Watch is optional; polling still works.
  }

  return NextResponse.redirect(await settingsUrl());
}
