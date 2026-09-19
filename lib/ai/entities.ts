import { and, eq, isNull } from "drizzle-orm";

import type { AskEntity } from "@/lib/ai/mentions";
import type { Tx } from "@/lib/db";
import {
  applications,
  contacts,
  conversations,
  properties,
  propertyPeople,
} from "@/lib/db/schema";

const PROPERTY_CAP = 300;
const CONTACT_CAP = 400;

function personHref(row: {
  conversationId: string | null;
  propertyId: string | null;
  applicationPropertyId: string | null;
}): { href: string; rank: number } | null {
  if (row.conversationId)
    return { href: `/inbox/${row.conversationId}`, rank: 0 };
  if (row.propertyId) {
    return { href: `/properties/${row.propertyId}/people`, rank: 1 };
  }
  if (row.applicationPropertyId) {
    return {
      href: `/properties/${row.applicationPropertyId}/applications`,
      rank: 2,
    };
  }
  return null;
}

/** Workspace records the Ask thread can turn into named chips. */
export async function listAskEntities(
  tx: Tx,
  workspaceId: string,
  userId: string,
): Promise<AskEntity[]> {
  const [propertyRows, contactRows, conversationRows] = await Promise.all([
    tx
      .select({
        id: properties.id,
        title: properties.title,
      })
      .from(properties)
      .where(
        and(
          eq(properties.workspaceId, workspaceId),
          isNull(properties.deletedAt),
        ),
      )
      .limit(PROPERTY_CAP),
    tx
      .select({
        id: contacts.id,
        title: contacts.fullName,
        conversationId: conversations.id,
        propertyId: propertyPeople.propertyId,
        applicationPropertyId: applications.propertyId,
      })
      .from(contacts)
      .leftJoin(
        conversations,
        and(
          eq(conversations.contactId, contacts.id),
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.userId, userId),
        ),
      )
      .leftJoin(propertyPeople, eq(propertyPeople.contactId, contacts.id))
      .leftJoin(applications, eq(applications.contactId, contacts.id))
      .where(eq(contacts.workspaceId, workspaceId))
      .limit(CONTACT_CAP),
    tx
      .select({
        id: conversations.id,
        subject: conversations.subject,
        contactName: contacts.fullName,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(200),
  ]);

  const entities: AskEntity[] = propertyRows.map((row) => ({
    kind: "property",
    id: row.id,
    title: row.title,
    href: `/properties/${row.id}`,
    matchName: true,
  }));

  const people = new Map<
    string,
    { title: string; href?: string; rank: number }
  >();
  for (const row of contactRows) {
    const next = personHref(row);
    const current = people.get(row.id);
    if (!next) {
      if (!current) people.set(row.id, { title: row.title, rank: 9 });
      continue;
    }
    if (!current || next.rank < current.rank) {
      people.set(row.id, {
        title: row.title,
        href: next.href,
        rank: next.rank,
      });
    }
  }
  for (const [id, person] of people) {
    if (!person.href) continue;
    entities.push({
      kind: "person",
      id,
      title: person.title,
      href: person.href,
      matchName: true,
    });
  }

  for (const row of conversationRows) {
    const title = row.subject?.trim() || row.contactName?.trim();
    if (!title) continue;
    entities.push({
      kind: "conversation",
      id: row.id,
      title,
      href: `/inbox/${row.id}`,
      matchName: false,
    });
  }

  return entities;
}
