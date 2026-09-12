import { and, desc, eq, sql } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import {
  contacts,
  conversations,
  integrations,
  messages,
  properties,
} from "@/lib/db/schema";

export const integrationPublic = {
  id: integrations.id,
  workspaceId: integrations.workspaceId,
  kind: integrations.kind,
  status: integrations.status,
  externalId: integrations.externalId,
  lastSyncedAt: integrations.lastSyncedAt,
};

export async function listIntegrations(tx: DbOrTx, workspaceId: string) {
  return tx
    .select(integrationPublic)
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId));
}

export async function getGmailIntegration(tx: DbOrTx, workspaceId: string) {
  const [row] = await tx
    .select(integrationPublic)
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.kind, "gmail"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function countUnread(tx: DbOrTx, workspaceId: string) {
  const [row] = await tx
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.isRead, false),
      ),
    );
  return row?.count ?? 0;
}

export async function listConversations(tx: DbOrTx, workspaceId: string) {
  const lastBody = sql<string | null>`(
    select ${messages.body} from ${messages}
    where ${messages.conversationId} = ${conversations.id}
    order by ${messages.sentAt} desc nulls last, ${messages.createdAt} desc
    limit 1
  )`;
  return tx
    .select({
      id: conversations.id,
      subject: conversations.subject,
      channel: conversations.channel,
      isRead: conversations.isRead,
      lastMessageAt: conversations.lastMessageAt,
      preview: lastBody,
      contactName: contacts.fullName,
      contactEmail: contacts.email,
      propertyId: properties.id,
      propertyTitle: properties.title,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(properties, eq(properties.id, conversations.propertyId))
    .where(eq(conversations.workspaceId, workspaceId))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
}

export async function getConversation(
  tx: DbOrTx,
  workspaceId: string,
  conversationId: string,
) {
  const [row] = await tx
    .select({
      conversation: conversations,
      contactName: contacts.fullName,
      contactEmail: contacts.email,
      propertyId: properties.id,
      propertyTitle: properties.title,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(properties, eq(properties.id, conversations.propertyId))
    .where(
      and(
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.id, conversationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listMessages(tx: DbOrTx, conversationId: string) {
  return tx
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.sentAt, messages.createdAt);
}
