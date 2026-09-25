import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { logActivity } from "@/lib/activity";
import { enqueueExtractTasks } from "@/lib/ai/enqueue";
import { db } from "@/lib/db";
import {
  contacts,
  conversations,
  messages,
  properties,
  propertyPeople,
} from "@/lib/db/schema";
import {
  matchContactId,
  matchPropertyId,
  normalizeSubject,
  parseFromHeader,
} from "@/lib/inbox/match";
import { resolveMailboxWorkspace } from "@/lib/inbox/resolve-workspace";
import { counterpartyEmail } from "@/lib/integrations/gmail/thread-messages";

export type InboundEmail = {
  userId: string;
  homeWorkspaceId: string;
  integrationId: string | null;
  from: string;
  to?: string | null;
  subject: string | null;
  body: string;
  bodyHtml?: string | null;
  externalId?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  sentAt?: Date;
};

export async function ingestInboundEmail(input: InboundEmail) {
  const parsed = parseFromHeader(input.from);
  if (!parsed.email) throw new Error("inbound_email_missing");

  if (input.externalId) {
    const [dup] = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversations.userId, input.userId),
          eq(messages.externalId, input.externalId),
        ),
      )
      .limit(1);
    if (dup) return { conversationId: dup.conversationId, created: false };
  }

  const haystack = `${input.subject ?? ""} ${input.body}`;
  const resolved = await resolveMailboxWorkspace({
    userId: input.userId,
    homeWorkspaceId: input.homeWorkspaceId,
    email: parsed.email,
    haystack,
  });
  const workspaceId = resolved.workspaceId;

  let contactId = resolved.contactId;
  if (!contactId) {
    const workspaceContacts = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        phone: contacts.phone,
      })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId));
    contactId = matchContactId(workspaceContacts, parsed.email, null);
  }
  if (!contactId) {
    try {
      const [created] = await db
        .insert(contacts)
        .values({
          workspaceId,
          fullName: parsed.name ?? parsed.email,
          email: parsed.email,
        })
        .returning({ id: contacts.id });
      contactId = created!.id;
    } catch {
      const [again] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, workspaceId),
            eq(contacts.email, parsed.email),
          ),
        )
        .limit(1);
      contactId = again?.id ?? null;
    }
  }
  if (!contactId) throw new Error("contact_failed");

  let conversationId: string | null = null;
  if (input.threadId) {
    const [threaded] = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversations.userId, input.userId),
          sql`${messages.meta}->>'threadId' = ${input.threadId}`,
        ),
      )
      .limit(1);
    conversationId = threaded?.conversationId ?? null;
  }

  if (!conversationId) {
    const subject = normalizeSubject(input.subject);
    const open = await db
      .select({ id: conversations.id, subject: conversations.subject })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, input.userId),
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.contactId, contactId),
          eq(conversations.channel, "email"),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(30);
    conversationId =
      open.find((c) => normalizeSubject(c.subject) === subject)?.id ?? null;
  }

  const linked = await db
    .select({ propertyId: propertyPeople.propertyId })
    .from(propertyPeople)
    .where(eq(propertyPeople.contactId, contactId));
  const listed = await db
    .select({ id: properties.id, title: properties.title })
    .from(properties)
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        isNull(properties.deletedAt),
      ),
    );
  const propertyId = matchPropertyId(
    listed,
    linked.map((l) => l.propertyId),
    haystack,
  );

  const sentAt = input.sentAt ?? new Date();
  if (!conversationId) {
    const [created] = await db
      .insert(conversations)
      .values({
        workspaceId,
        userId: input.userId,
        integrationId: input.integrationId,
        channel: "email",
        contactId,
        propertyId,
        subject: input.subject,
        lastMessageAt: sentAt,
        isRead: false,
      })
      .returning({ id: conversations.id });
    conversationId = created!.id;
  } else {
    const [existing] = await db
      .select({
        propertyId: conversations.propertyId,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    const newer =
      !existing?.lastMessageAt ||
      sentAt.getTime() > existing.lastMessageAt.getTime();
    await db
      .update(conversations)
      .set({
        propertyId: propertyId ?? existing?.propertyId ?? null,
        ...(input.integrationId ? { integrationId: input.integrationId } : {}),
        ...(newer
          ? {
              contactId,
              lastMessageAt: sentAt,
              isRead: false,
              mailboxState: "inbox" as const,
              ...(input.subject ? { subject: input.subject } : {}),
            }
          : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  await db.insert(messages).values({
    conversationId,
    direction: "in",
    body: input.body,
    bodyHtml: input.bodyHtml ?? null,
    externalId: input.externalId ?? null,
    sentAt,
    meta: {
      threadId: input.threadId ?? null,
      messageId: input.messageId ?? null,
      inReplyTo: input.inReplyTo ?? null,
      from: input.from,
      to: input.to ?? null,
    },
  });

  await logActivity({
    workspaceId,
    propertyId,
    action: "inbox.message_received",
    entity: "conversation",
    entityId: conversationId,
    data: { email: parsed.email, subject: input.subject },
  });

  try {
    await enqueueExtractTasks(conversationId);
  } catch {
    // Extraction is best-effort; ingest already succeeded.
  }

  return { conversationId, created: true };
}

/**
 * Store a message the mailbox owner sent, on the same thread as the other
 * person. Does not create a contact for the owner.
 */
export async function ingestOwnEmail(input: InboundEmail & { mailbox: string }) {
  if (input.externalId) {
    const [dup] = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversations.userId, input.userId),
          eq(messages.externalId, input.externalId),
        ),
      )
      .limit(1);
    if (dup) return { conversationId: dup.conversationId, created: false };
  }

  const sentAt = input.sentAt ?? new Date();
  let conversationId = await findConversationByThread(
    input.userId,
    input.threadId,
  );
  let advanceThread = false;

  if (!conversationId) {
    const email = counterpartyEmail(input.to, input.mailbox);
    if (!email) return { conversationId: null, created: false };

    const haystack = `${input.subject ?? ""} ${input.body}`;
    const resolved = await resolveMailboxWorkspace({
      userId: input.userId,
      homeWorkspaceId: input.homeWorkspaceId,
      email,
      haystack,
    });
    const contactId = await ensureContact(resolved.workspaceId, email, email);
    conversationId = await findConversationBySubject(
      input.userId,
      resolved.workspaceId,
      contactId,
      input.subject,
    );
    if (!conversationId) {
      const propertyId = await matchPropertyForContact(
        resolved.workspaceId,
        contactId,
        haystack,
      );
      const [created] = await db
        .insert(conversations)
        .values({
          workspaceId: resolved.workspaceId,
          userId: input.userId,
          integrationId: input.integrationId,
          channel: "email",
          contactId,
          propertyId,
          subject: input.subject,
          lastMessageAt: sentAt,
          isRead: true,
        })
        .returning({ id: conversations.id });
      conversationId = created!.id;
      advanceThread = true;
    }
  }

  if (!advanceThread) {
    const [existing] = await db
      .select({ lastMessageAt: conversations.lastMessageAt })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    advanceThread =
      !existing?.lastMessageAt ||
      sentAt.getTime() > existing.lastMessageAt.getTime();
    await db
      .update(conversations)
      .set({
        ...(input.integrationId ? { integrationId: input.integrationId } : {}),
        ...(advanceThread ? { lastMessageAt: sentAt, isRead: true } : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  await db.insert(messages).values({
    conversationId,
    direction: "out",
    body: input.body,
    bodyHtml: input.bodyHtml ?? null,
    externalId: input.externalId ?? null,
    sentAt,
    meta: {
      threadId: input.threadId ?? null,
      messageId: input.messageId ?? null,
      inReplyTo: input.inReplyTo ?? null,
      from: input.from,
      to: input.to ?? null,
    },
  });

  if (advanceThread) {
    try {
      await enqueueExtractTasks(conversationId);
    } catch {
      // Extraction is best-effort; the message is already stored.
    }
  }

  return { conversationId, created: true };
}

async function findConversationByThread(
  userId: string,
  threadId: string | null | undefined,
) {
  if (!threadId) return null;
  const [threaded] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.userId, userId),
        sql`${messages.meta}->>'threadId' = ${threadId}`,
      ),
    )
    .limit(1);
  return threaded?.conversationId ?? null;
}

async function findConversationBySubject(
  userId: string,
  workspaceId: string,
  contactId: string,
  subject: string | null,
) {
  const normalized = normalizeSubject(subject);
  const open = await db
    .select({ id: conversations.id, subject: conversations.subject })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.contactId, contactId),
        eq(conversations.channel, "email"),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(30);
  return open.find((c) => normalizeSubject(c.subject) === normalized)?.id ?? null;
}

async function ensureContact(
  workspaceId: string,
  email: string,
  name: string,
) {
  const workspaceContacts = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));
  const matched = matchContactId(workspaceContacts, email, null);
  if (matched) return matched;
  try {
    const [created] = await db
      .insert(contacts)
      .values({
        workspaceId,
        fullName: name,
        email,
      })
      .returning({ id: contacts.id });
    return created!.id;
  } catch {
    const [again] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.email, email)))
      .limit(1);
    if (!again) throw new Error("contact_failed");
    return again.id;
  }
}

async function matchPropertyForContact(
  workspaceId: string,
  contactId: string,
  haystack: string,
) {
  const linked = await db
    .select({ propertyId: propertyPeople.propertyId })
    .from(propertyPeople)
    .where(eq(propertyPeople.contactId, contactId));
  const listed = await db
    .select({ id: properties.id, title: properties.title })
    .from(properties)
    .where(
      and(eq(properties.workspaceId, workspaceId), isNull(properties.deletedAt)),
    );
  return matchPropertyId(
    listed,
    linked.map((l) => l.propertyId),
    haystack,
  );
}
