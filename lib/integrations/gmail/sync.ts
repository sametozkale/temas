import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { ingestInboundEmail } from "@/lib/inbox/ingest";
import { parseFromHeader } from "@/lib/inbox/match";
import {
  type GmailCredentials,
  gmailGetMessage,
  gmailHistory,
  gmailListInbox,
  gmailProfile,
  gmailPubsubTopic,
  gmailTopicConfigured,
  gmailWatch,
} from "@/lib/integrations/gmail/client";
import { parseGmailMessage } from "@/lib/integrations/gmail/parse";

export function asGmailCredentials(
  raw: Record<string, unknown> | null | undefined,
): GmailCredentials {
  if (!raw) return {};
  return raw as GmailCredentials;
}

async function persistCredentials(
  integrationId: string,
  credentials: GmailCredentials,
  extra: {
    externalId?: string | null;
    lastSyncedAt?: Date;
    status?: string;
  } = {},
) {
  await db
    .update(integrations)
    .set({
      credentials,
      ...(extra.externalId !== undefined
        ? { externalId: extra.externalId }
        : {}),
      ...(extra.lastSyncedAt ? { lastSyncedAt: extra.lastSyncedAt } : {}),
      ...(extra.status ? { status: extra.status } : {}),
    })
    .where(eq(integrations.id, integrationId));
}

export async function enableGmailWatch(integrationId: string) {
  if (!gmailTopicConfigured()) return;
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);
  if (!row) return;
  const credentials = asGmailCredentials(row.credentials);
  if (credentials.mode === "dev" || !credentials.refreshToken) return;
  const watch = await gmailWatch(credentials, gmailPubsubTopic());
  credentials.historyId = watch.historyId;
  credentials.watchExpiration = watch.expiration;
  await persistCredentials(integrationId, credentials);
}

export async function syncGmailIntegration(integrationId: string) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.kind, "gmail")),
    )
    .limit(1);
  if (!row || row.status !== "connected") {
    return { ingested: 0, skipped: true as const };
  }

  const credentials = asGmailCredentials(row.credentials);
  if (credentials.mode === "dev" || !credentials.refreshToken) {
    return { ingested: 0, skipped: true as const };
  }

  const profile = await gmailProfile(credentials);
  const mailbox = profile.emailAddress.toLowerCase();

  let ids: string[] = [];
  let historyId = credentials.historyId ?? profile.historyId;
  if (credentials.historyId) {
    try {
      const delta = await gmailHistory(credentials, credentials.historyId);
      ids = delta.ids;
      historyId = delta.historyId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.startsWith("gmail_404")) throw error;
      const full = await gmailListInbox(credentials);
      ids = full.ids;
      historyId = full.historyId ?? profile.historyId;
    }
  } else {
    const full = await gmailListInbox(credentials);
    ids = full.ids;
    historyId = full.historyId ?? profile.historyId;
  }

  let ingested = 0;
  for (const id of ids) {
    const raw = await gmailGetMessage(credentials, id);
    if (raw.labelIds && !raw.labelIds.includes("INBOX")) continue;
    const parsed = parseGmailMessage(raw);
    const from = parseFromHeader(parsed.from);
    if (from.email && from.email === mailbox) continue;
    const result = await ingestInboundEmail({
      userId: row.userId,
      homeWorkspaceId: row.workspaceId,
      integrationId: row.id,
      from: parsed.from,
      to: parsed.to,
      subject: parsed.subject || null,
      body: parsed.body,
      bodyHtml: parsed.bodyHtml,
      externalId: parsed.externalId,
      threadId: parsed.threadId,
      messageId: parsed.messageId || null,
      inReplyTo: parsed.inReplyTo || null,
      sentAt: parsed.sentAt,
    });
    if (result.created) ingested += 1;
  }

  credentials.historyId = historyId;
  credentials.accessToken = credentials.accessToken;
  credentials.expiry = credentials.expiry;
  await persistCredentials(row.id, credentials, {
    externalId: mailbox,
    lastSyncedAt: new Date(),
    status: "connected",
  });

  return { ingested, skipped: false as const };
}

export async function syncAllGmail() {
  const rows = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(eq(integrations.kind, "gmail"), eq(integrations.status, "connected")),
    );
  const results = [];
  for (const row of rows) {
    results.push(await syncGmailIntegration(row.id));
  }
  return results;
}
