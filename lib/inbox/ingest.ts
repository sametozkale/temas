import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { logActivity } from "@/lib/activity";
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

export type InboundEmail = {
  workspaceId: string;
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
          eq(conversations.workspaceId, input.workspaceId),
          eq(messages.externalId, input.externalId),
        ),
      )
      .limit(1);
    if (dup) return { conversationId: dup.conversationId, created: false };
  }

  const workspaceContacts = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(eq(contacts.workspaceId, input.workspaceId));

  let contactId = matchContactId(workspaceContacts, parsed.email, null);
  if (!contactId) {
    try {
      const [created] = await db
        .insert(contacts)
        .values({
          workspaceId: input.workspaceId,
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
            eq(contacts.workspaceId, input.workspaceId),
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
          eq(conversations.workspaceId, input.workspaceId),
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
          eq(conversations.workspaceId, input.workspaceId),
          eq(conversations.contactId, contactId),
          eq(conversations.channel, "email"),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(30);
    conversationId =
      open.find((c) => normalizeSubject(c.subject) === subject)?.id ?? null;
  }

  const haystack = `${input.subject ?? ""} ${input.body}`;
  const linked = await db
    .select({ propertyId: propertyPeople.propertyId })
    .from(propertyPeople)
    .where(eq(propertyPeople.contactId, contactId));
  const listed = await db
    .select({ id: properties.id, title: properties.title })
    .from(properties)
    .where(
      and(
        eq(properties.workspaceId, input.workspaceId),
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
        workspaceId: input.workspaceId,
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
      .select({ propertyId: conversations.propertyId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    await db
      .update(conversations)
      .set({
        contactId,
        propertyId: propertyId ?? existing?.propertyId ?? null,
        lastMessageAt: sentAt,
        isRead: false,
        ...(input.integrationId ? { integrationId: input.integrationId } : {}),
        ...(input.subject ? { subject: input.subject } : {}),
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
    workspaceId: input.workspaceId,
    propertyId,
    action: "inbox.message_received",
    entity: "conversation",
    entityId: conversationId,
    data: { email: parsed.email, subject: input.subject },
  });

  return { conversationId, created: true };
}
