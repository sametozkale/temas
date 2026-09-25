import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversations, integrations, messages } from "@/lib/db/schema";
import { ingestInboundEmail, ingestOwnEmail } from "@/lib/inbox/ingest";
import { parseFromHeader } from "@/lib/inbox/match";
import {
  type GmailCredentials,
  gmailGetMessage,
  gmailGetThread,
  gmailGetThreadMessages,
  gmailHistory,
  gmailListInbox,
  gmailThreadStarred,
  gmailProfile,
  gmailPubsubTopic,
  gmailTopicConfigured,
  gmailWatch,
} from "@/lib/integrations/gmail/client";
import { parseGmailMessage } from "@/lib/integrations/gmail/parse";
import {
  isMailboxAddress,
  visibleGmailThreadMessage,
} from "@/lib/integrations/gmail/thread-messages";

export function asGmailCredentials(
  raw: Record<string, unknown> | null | undefined,
): GmailCredentials {
  if (!raw) return {};
  return raw as GmailCredentials;
}

export async function persistGmailCredentials(
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
  credentials.watchExpiration = watch.expiration;
  if (!credentials.historyId) credentials.historyId = watch.historyId;
  await persistGmailCredentials(integrationId, credentials);
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

  const bootstrap = credentials.bootstrapped !== true;
  let threadIds: string[] = [];
  let fallbackIds: string[] = [];
  let starThreadIds: string[] = [];
  let historyId = credentials.historyId ?? profile.historyId;
  if (!bootstrap && credentials.historyId) {
    try {
      const delta = await gmailHistory(credentials, credentials.historyId);
      threadIds = delta.threadIds;
      fallbackIds = delta.ids;
      starThreadIds = delta.starThreadIds;
      historyId = delta.historyId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.startsWith("gmail_404")) throw error;
      const full = await gmailListInbox(credentials);
      threadIds = full.threadIds;
      historyId = full.historyId ?? profile.historyId;
    }
  } else {
    const full = await gmailListInbox(credentials);
    threadIds = full.threadIds;
    historyId = profile.historyId;
    credentials.inboxPageToken = full.nextPageToken ?? "";
  }

  const resolvedThreads = await threadIdsForMessages(
    credentials,
    fallbackIds,
    threadIds,
  );
  const ingested = await ingestGmailThreads(
    row,
    credentials,
    mailbox,
    resolvedThreads,
    { requireInbox: true },
  );

  if (!bootstrap) {
    await syncGmailStars(row.userId, credentials, starThreadIds);
  }

  credentials.historyId = historyId;
  credentials.bootstrapped = true;
  credentials.accessToken = credentials.accessToken;
  credentials.expiry = credentials.expiry;
  await persistGmailCredentials(row.id, credentials, {
    externalId: mailbox,
    lastSyncedAt: new Date(),
    status: "connected",
  });

  return { ingested, skipped: false as const };
}

/** True while an older INBOX page can still be fetched. */
export function gmailHasOlderMail(credentials: GmailCredentials) {
  if (credentials.mode === "dev" || !credentials.refreshToken) return false;
  return credentials.inboxPageToken !== "";
}

export async function gmailOlderAvailable(userId: string) {
  const [row] = await db
    .select({ credentials: integrations.credentials })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return false;
  return gmailHasOlderMail(asGmailCredentials(row.credentials));
}

/** Fetch the next older INBOX page and store it. One page per call. */
export async function loadOlderGmail(userId: string) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return { more: false };
  const credentials = asGmailCredentials(row.credentials);
  if (!gmailHasOlderMail(credentials)) return { more: false };

  let token = credentials.inboxPageToken;
  if (!token) {
    const first = await gmailListInbox(credentials);
    token = first.nextPageToken ?? "";
    if (!token) {
      credentials.inboxPageToken = "";
      await persistGmailCredentials(row.id, credentials);
      return { more: false };
    }
  }

  const profile = await gmailProfile(credentials);
  const mailbox = profile.emailAddress.toLowerCase();
  const page = await gmailListInbox(credentials, 50, token);
  await ingestGmailThreads(row, credentials, mailbox, page.threadIds, {
    requireInbox: true,
  });

  credentials.inboxPageToken = page.nextPageToken ?? "";
  await persistGmailCredentials(row.id, credentials, {
    lastSyncedAt: new Date(),
  });
  return { more: gmailHasOlderMail(credentials) };
}

/** Mirror Gmail's current star onto the local thread. */
async function syncGmailStars(
  userId: string,
  credentials: GmailCredentials,
  changedThreadIds: string[],
) {
  const local = await db
    .select({
      threadId: sql<string | null>`${messages.meta}->>'threadId'`,
    })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(eq(conversations.userId, userId), eq(conversations.starred, true)),
    );
  const threadIds = [
    ...new Set(
      [...changedThreadIds, ...local.map((row) => row.threadId)].filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      ),
    ),
  ];
  for (const threadId of threadIds) {
    let starred: boolean | null = null;
    try {
      const thread = await gmailGetThread(credentials, threadId);
      starred = gmailThreadStarred(thread.messages ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("gmail_404")) starred = false;
    }
    if (starred === null) continue;
    const matches = await db
      .select({ id: conversations.id })
      .from(conversations)
      .innerJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.userId, userId),
          sql`${messages.meta}->>'threadId' = ${threadId}`,
        ),
      );
    const ids = [...new Set(matches.map((match) => match.id))];
    if (ids.length === 0) continue;
    await db
      .update(conversations)
      .set({ starred })
      .where(
        and(eq(conversations.userId, userId), inArray(conversations.id, ids)),
      );
  }
}

/** Import the current INBOX once, then later syncs stay incremental. */
export async function bootstrapGmailIfNeeded(userId: string) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return;
  const credentials = asGmailCredentials(row.credentials);
  if (credentials.mode === "dev" || credentials.bootstrapped === true) return;
  if (!credentials.refreshToken) return;
  await syncGmailIntegration(row.id);
}

/** Store both sides of one Gmail thread already linked to a conversation. */
export async function fillGmailConversation(
  userId: string,
  conversationId: string,
) {
  const [conversation] = await db
    .select({
      channel: conversations.channel,
      userId: conversations.userId,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);
  if (!conversation || conversation.channel !== "email") return;

  const [anchor] = await db
    .select({
      threadId: sql<string | null>`${messages.meta}->>'threadId'`,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .limit(1);
  const threadId = anchor?.threadId;
  if (!threadId) return;

  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return;
  const credentials = asGmailCredentials(row.credentials);
  if (credentials.mode === "dev" || !credentials.refreshToken) return;
  const mailbox = (
    row.externalId ?? (await gmailProfile(credentials)).emailAddress
  ).toLowerCase();
  await ingestGmailThreads(row, credentials, mailbox, [threadId]);
}

async function threadIdsForMessages(
  credentials: GmailCredentials,
  messageIds: string[],
  known: string[],
) {
  const threadIds = new Set(known);
  if (threadIds.size > 0 || messageIds.length === 0) return [...threadIds];
  for (const id of messageIds) {
    const raw = await gmailGetMessage(credentials, id);
    if (raw.threadId) threadIds.add(raw.threadId);
  }
  return [...threadIds];
}

async function ingestGmailThreads(
  row: { id: string; userId: string; workspaceId: string },
  credentials: GmailCredentials,
  mailbox: string,
  threadIds: string[],
  options: { requireInbox?: boolean } = {},
) {
  let ingested = 0;
  const seen = new Set<string>();
  for (const threadId of threadIds) {
    if (!threadId || seen.has(threadId)) continue;
    seen.add(threadId);
    let thread: Awaited<ReturnType<typeof gmailGetThreadMessages>>;
    try {
      thread = await gmailGetThreadMessages(credentials, threadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("gmail_404")) continue;
      throw error;
    }
    const rawMessages = thread.messages ?? [];
    if (
      options.requireInbox &&
      !rawMessages.some((message) => message.labelIds?.includes("INBOX"))
    ) {
      continue;
    }
    const ordered = rawMessages
      .filter((message) => visibleGmailThreadMessage(message.labelIds))
      .map((message) => parseGmailMessage(message))
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    for (const parsed of ordered) {
      const from = parseFromHeader(parsed.from);
      const own = isMailboxAddress(from.email, mailbox);
      const payload = {
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
      };
      const result = own
        ? await ingestOwnEmail({ ...payload, mailbox })
        : await ingestInboundEmail(payload);
      if (result.created) ingested += 1;
    }
  }
  return ingested;
}

/** Pull new mail and Gmail star changes. Safe to call on each Inbox visit. */
export async function refreshGmailInbox(userId: string) {
  const [row] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return;
  await syncGmailIntegration(row.id);
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
