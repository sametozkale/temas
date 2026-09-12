import { and, desc, eq } from "drizzle-orm";

import { InboxReplyEmail } from "@/emails/inbox-reply";
import { logActivity } from "@/lib/activity";
import { acceptancePct } from "@/lib/ai/acceptance";
import { db } from "@/lib/db";
import {
  aiDrafts,
  contacts,
  conversations,
  integrations,
  messages,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/integrations/resend";
import {
  type GmailCredentials,
  gmailSend,
} from "@/lib/integrations/gmail/client";
import { asGmailCredentials } from "@/lib/integrations/gmail/sync";
import { sendWhatsAppText } from "@/lib/integrations/whatsapp/client";
import { digitsPhone } from "@/lib/integrations/whatsapp/parse";
import { normalizeSubject } from "@/lib/inbox/match";

function buildRfc822(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
}) {
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
  ];
  if (input.inReplyTo) {
    headers.push(`In-Reply-To: ${input.inReplyTo}`);
    headers.push(`References: ${input.inReplyTo}`);
  }
  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

export async function sendInboxReply(input: {
  workspaceId: string;
  actorId: string;
  conversationId: string;
  body: string;
  draftId?: string | null;
}) {
  const [row] = await db
    .select({
      conversation: conversations,
      contactEmail: contacts.email,
      contactName: contacts.fullName,
      contactPhone: contacts.phone,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .where(
      and(
        eq(conversations.id, input.conversationId),
        eq(conversations.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("not_found");

  if (row.conversation.channel === "whatsapp") {
    await sendWhatsAppReply(input, row);
    return;
  }

  const to = row.contactEmail?.trim().toLowerCase();
  if (!to) throw new Error("no_recipient");

  const [lastIn] = await db
    .select({ meta: messages.meta, body: messages.body })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, input.conversationId),
        eq(messages.direction, "in"),
      ),
    )
    .orderBy(desc(messages.sentAt), desc(messages.createdAt))
    .limit(1);

  const subjectBase = normalizeSubject(row.conversation.subject) || "Havn";
  const subject = subjectBase.toLowerCase().startsWith("re:")
    ? subjectBase
    : `Re: ${subjectBase}`;
  const threadId =
    typeof lastIn?.meta.threadId === "string" ? lastIn.meta.threadId : null;
  const inReplyTo =
    typeof lastIn?.meta.messageId === "string" ? lastIn.meta.messageId : null;

  let integration: {
    id: string;
    credentials: GmailCredentials;
    externalId: string | null;
  } | null = null;
  if (row.conversation.integrationId) {
    const [found] = await db
      .select({
        id: integrations.id,
        credentials: integrations.credentials,
        externalId: integrations.externalId,
      })
      .from(integrations)
      .where(eq(integrations.id, row.conversation.integrationId))
      .limit(1);
    if (found) {
      integration = {
        id: found.id,
        credentials: asGmailCredentials(found.credentials),
        externalId: found.externalId,
      };
    }
  }

  const fromAddress =
    integration?.externalId ??
    env().EMAIL_FROM.match(/<([^>]+)>/)?.[1] ??
    "noreply@havn.local";
  let externalId: string | null = null;
  let sentThreadId = threadId;

  if (
    integration &&
    integration.credentials.mode !== "dev" &&
    integration.credentials.refreshToken
  ) {
    const sent = await gmailSend(
      integration.credentials,
      buildRfc822({
        from: fromAddress,
        to,
        subject,
        body: input.body,
        inReplyTo,
      }),
      threadId,
    );
    externalId = sent.id;
    sentThreadId = sent.threadId;
    await db
      .update(integrations)
      .set({ credentials: integration.credentials })
      .where(eq(integrations.id, integration.id));
  } else {
    await sendEmail({
      to,
      subject,
      replyTo: fromAddress,
      react: InboxReplyEmail({
        recipientName: row.contactName ?? to,
        body: input.body,
        subject,
      }),
    });
  }

  const sentAt = new Date();
  await db.insert(messages).values({
    conversationId: input.conversationId,
    direction: "out",
    body: input.body,
    externalId,
    sentAt,
    meta: {
      threadId: sentThreadId,
      inReplyTo,
      to,
    },
  });
  await db
    .update(conversations)
    .set({ lastMessageAt: sentAt, isRead: true })
    .where(eq(conversations.id, input.conversationId));
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    propertyId: row.conversation.propertyId,
    action: "inbox.reply_sent",
    entity: "conversation",
    entityId: input.conversationId,
  });

  await markDraftSent(input.conversationId, input.draftId, input.body);
}

async function sendWhatsAppReply(
  input: {
    workspaceId: string;
    actorId: string;
    conversationId: string;
    body: string;
    draftId?: string | null;
  },
  row: {
    conversation: typeof conversations.$inferSelect;
    contactName: string | null;
    contactPhone: string | null;
  },
) {
  const to = row.contactPhone ? digitsPhone(row.contactPhone) : "";
  if (to.length < 7) throw new Error("no_recipient");
  const sent = await sendWhatsAppText({ to, body: input.body });
  const sentAt = new Date();
  await db.insert(messages).values({
    conversationId: input.conversationId,
    direction: "out",
    body: input.body,
    externalId: sent.externalId,
    sentAt,
    meta: { to, channel: "whatsapp", mode: sent.mode },
  });
  await db
    .update(conversations)
    .set({ lastMessageAt: sentAt, isRead: true })
    .where(eq(conversations.id, input.conversationId));
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    propertyId: row.conversation.propertyId,
    action: "inbox.reply_sent",
    entity: "conversation",
    entityId: input.conversationId,
    data: { channel: "whatsapp" },
  });
  await markDraftSent(input.conversationId, input.draftId, input.body);
}

async function markDraftSent(
  conversationId: string,
  draftId: string | null | undefined,
  sentBody: string,
) {
  if (!draftId) return;
  const [draft] = await db
    .select({ id: aiDrafts.id, body: aiDrafts.body })
    .from(aiDrafts)
    .where(
      and(
        eq(aiDrafts.id, draftId),
        eq(aiDrafts.conversationId, conversationId),
      ),
    )
    .limit(1);
  if (!draft) return;
  await db
    .update(aiDrafts)
    .set({
      status: "sent",
      acceptancePct: acceptancePct(draft.body, sentBody),
    })
    .where(eq(aiDrafts.id, draft.id));
}
