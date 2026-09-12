import { and, desc, eq, isNull } from "drizzle-orm";

import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import {
  contacts,
  conversations,
  messages,
  properties,
  propertyPeople,
} from "@/lib/db/schema";
import { matchContactId, matchPropertyId } from "@/lib/inbox/match";
import { digitsPhone } from "@/lib/integrations/whatsapp/parse";

export type InboundWhatsApp = {
  workspaceId: string;
  integrationId: string | null;
  from: string;
  profileName: string | null;
  body: string;
  externalId?: string | null;
  sentAt?: Date;
};

export async function ingestInboundWhatsApp(input: InboundWhatsApp) {
  const digits = digitsPhone(input.from);
  if (digits.length < 7) throw new Error("inbound_phone_missing");

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

  let contactId = matchContactId(workspaceContacts, null, digits);
  if (!contactId) {
    try {
      const [created] = await db
        .insert(contacts)
        .values({
          workspaceId: input.workspaceId,
          fullName: input.profileName ?? digits,
          phone: `+${digits}`,
        })
        .returning({ id: contacts.id });
      contactId = created!.id;
    } catch {
      const again = await db
        .select({
          id: contacts.id,
          email: contacts.email,
          phone: contacts.phone,
        })
        .from(contacts)
        .where(eq(contacts.workspaceId, input.workspaceId))
        .limit(50);
      contactId = matchContactId(again, null, digits);
    }
  }
  if (!contactId) throw new Error("contact_failed");

  const [open] = await db
    .select({ id: conversations.id, propertyId: conversations.propertyId })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, input.workspaceId),
        eq(conversations.contactId, contactId),
        eq(conversations.channel, "whatsapp"),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1);

  const haystack = `${input.profileName ?? ""} ${input.body}`;
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
  let conversationId = open?.id ?? null;
  if (!conversationId) {
    const [created] = await db
      .insert(conversations)
      .values({
        workspaceId: input.workspaceId,
        integrationId: input.integrationId,
        channel: "whatsapp",
        contactId,
        propertyId,
        subject: "WhatsApp",
        lastMessageAt: sentAt,
        isRead: false,
      })
      .returning({ id: conversations.id });
    conversationId = created!.id;
  } else {
    await db
      .update(conversations)
      .set({
        propertyId: propertyId ?? open?.propertyId ?? null,
        lastMessageAt: sentAt,
        isRead: false,
        ...(input.integrationId ? { integrationId: input.integrationId } : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  await db.insert(messages).values({
    conversationId,
    direction: "in",
    body: input.body,
    externalId: input.externalId ?? null,
    sentAt,
    meta: { from: input.from, channel: "whatsapp" },
  });

  await logActivity({
    workspaceId: input.workspaceId,
    propertyId,
    action: "inbox.message_received",
    entity: "conversation",
    entityId: conversationId,
    data: { channel: "whatsapp", from: input.from },
  });

  return { conversationId, created: true };
}
