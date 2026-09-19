import { and, desc, eq, sql } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import type { InboxListFilters } from "@/lib/inbox/filters";
import {
  contacts,
  conversations,
  integrations,
  messages,
  profiles,
  properties,
} from "@/lib/db/schema";

export const integrationPublic = {
  id: integrations.id,
  userId: integrations.userId,
  workspaceId: integrations.workspaceId,
  kind: integrations.kind,
  status: integrations.status,
  externalId: integrations.externalId,
  lastSyncedAt: integrations.lastSyncedAt,
};

export async function listIntegrations(tx: DbOrTx, userId: string) {
  return tx
    .select(integrationPublic)
    .from(integrations)
    .where(eq(integrations.userId, userId));
}

export async function getGmailIntegration(tx: DbOrTx, userId: string) {
  const [row] = await tx
    .select(integrationPublic)
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.kind, "gmail")))
    .limit(1);
  return row ?? null;
}

export async function countUnread(
  tx: DbOrTx,
  workspaceId: string,
  userId: string,
) {
  const [row] = await tx
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.userId, userId),
        eq(conversations.isRead, false),
      ),
    );
  return row?.count ?? 0;
}

export async function listConversations(
  tx: DbOrTx,
  workspaceId: string,
  userId: string,
  filters: InboxListFilters = {},
) {
  const lastBody = sql<string | null>`(
    select ${messages.body} from ${messages}
    where ${messages.conversationId} = ${conversations.id}
    order by ${messages.sentAt} desc nulls last, ${messages.createdAt} desc
    limit 1
  )`;
  const where = [
    eq(conversations.workspaceId, workspaceId),
    eq(conversations.userId, userId),
  ];
  if (filters.assignedUserId) {
    where.push(eq(properties.assignedUserId, filters.assignedUserId));
  }
  if (filters.channel) {
    where.push(eq(conversations.channel, filters.channel));
  }
  if (filters.unanswered) {
    where.push(sql`(
      select ${messages.direction} from ${messages}
      where ${messages.conversationId} = ${conversations.id}
      order by ${messages.sentAt} desc nulls last, ${messages.createdAt} desc
      limit 1
    ) = 'in'`);
  }
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
      assignedAgentName: profiles.fullName,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(properties, eq(properties.id, conversations.propertyId))
    .leftJoin(profiles, eq(profiles.id, properties.assignedUserId))
    .where(and(...where))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
}

export async function getConversation(
  tx: DbOrTx,
  workspaceId: string,
  userId: string,
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
        eq(conversations.userId, userId),
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
