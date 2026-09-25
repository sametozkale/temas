import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversations, integrations, messages } from "@/lib/db/schema";
import {
  gmailModifyThread,
  gmailTrashThread,
} from "@/lib/integrations/gmail/client";
import {
  asGmailCredentials,
  persistGmailCredentials,
} from "@/lib/integrations/gmail/sync";

export const MAILBOX_ACTIONS = [
  "archive",
  "spam",
  "trash",
  "unread",
  "star",
  "unstar",
] as const;

export type MailboxAction = (typeof MAILBOX_ACTIONS)[number];

/** Gmail label change for one mailbox action. Trash is a separate API call. */
export function gmailLabelChange(action: Exclude<MailboxAction, "trash">): {
  addLabelIds?: string[];
  removeLabelIds?: string[];
} {
  switch (action) {
    case "archive":
      return { removeLabelIds: ["INBOX"] };
    case "spam":
      return { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] };
    case "unread":
      return { addLabelIds: ["UNREAD"] };
    case "star":
      return { addLabelIds: ["STARRED"] };
    case "unstar":
      return { removeLabelIds: ["STARRED"] };
  }
}

export async function applyMailboxAction(input: {
  workspaceId: string;
  userId: string;
  conversationId: string;
  action: MailboxAction;
}) {
  const [row] = await db
    .select({
      id: conversations.id,
      channel: conversations.channel,
      integrationId: conversations.integrationId,
      userId: conversations.userId,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, input.conversationId),
        eq(conversations.workspaceId, input.workspaceId),
        eq(conversations.userId, input.userId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("not_found");
  if (row.channel !== "email") throw new Error("not_email");

  const stored = await db
    .select({ externalId: messages.externalId, meta: messages.meta })
    .from(messages)
    .where(eq(messages.conversationId, row.id));
  const threadIds = [
    ...new Set(
      stored
        .map((message) => message.meta.threadId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const integration = await loadGmail(row.userId, row.integrationId);
  if (integration && integration.credentials.mode !== "dev") {
    if (threadIds.length === 0) throw new Error("mailbox_failed");
    if (input.action === "trash") {
      await Promise.all(
        threadIds.map((id) => gmailTrashThread(integration.credentials, id)),
      );
    } else {
      const change = gmailLabelChange(input.action);
      await Promise.all(
        threadIds.map((id) =>
          gmailModifyThread(integration.credentials, id, change),
        ),
      );
    }
    await persistGmailCredentials(integration.id, integration.credentials);
  }

  if (input.action === "star" || input.action === "unstar") {
    await db
      .update(conversations)
      .set({ starred: input.action === "star" })
      .where(eq(conversations.id, row.id));
    return;
  }
  if (input.action === "unread") {
    await db
      .update(conversations)
      .set({ isRead: false })
      .where(eq(conversations.id, row.id));
    return;
  }
  const mailboxState =
    input.action === "archive"
      ? "archived"
      : input.action === "spam"
        ? "spam"
        : "trash";
  await db
    .update(conversations)
    .set({ mailboxState })
    .where(eq(conversations.id, row.id));
}

async function loadGmail(userId: string, integrationId: string | null) {
  const owner = and(
    eq(integrations.userId, userId),
    eq(integrations.kind, "gmail"),
    eq(integrations.status, "connected"),
  );
  const columns = {
    id: integrations.id,
    credentials: integrations.credentials,
  };
  const [matched] = integrationId
    ? await db
        .select(columns)
        .from(integrations)
        .where(and(owner, eq(integrations.id, integrationId)))
        .limit(1)
    : [];
  const found =
    matched ??
    (await db.select(columns).from(integrations).where(owner).limit(1))[0];
  if (!found) return null;
  return {
    id: found.id,
    credentials: asGmailCredentials(found.credentials),
  };
}
