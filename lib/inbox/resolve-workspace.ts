import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, properties, workspaceMembers } from "@/lib/db/schema";
import { matchContactId, matchPropertyId } from "@/lib/inbox/match";

export type MailboxContact = {
  id: string;
  workspaceId: string;
  email: string | null;
  phone: string | null;
};

export type MailboxProperty = {
  id: string;
  workspaceId: string;
  title: string;
};

/**
 * Pick which workspace an inbound message belongs to (docs/03 §6).
 * Unique contact match wins; several matches prefer a property title hit,
 * then the home workspace, then the first membership.
 */
export function pickMailboxWorkspace(input: {
  homeWorkspaceId: string;
  membershipWorkspaceIds: string[];
  contacts: MailboxContact[];
  properties: MailboxProperty[];
  email: string | null;
  phone: string | null;
  haystack: string;
}): { workspaceId: string; contactId: string | null } {
  const members = new Set(input.membershipWorkspaceIds);
  const byWorkspace = new Map<string, string>();
  for (const contact of input.contacts) {
    if (!members.has(contact.workspaceId)) continue;
    if (matchContactId([contact], input.email, input.phone) !== contact.id) {
      continue;
    }
    if (!byWorkspace.has(contact.workspaceId)) {
      byWorkspace.set(contact.workspaceId, contact.id);
    }
  }
  const matched = [...byWorkspace.keys()];
  if (matched.length === 1) {
    const workspaceId = matched[0]!;
    return { workspaceId, contactId: byWorkspace.get(workspaceId) ?? null };
  }
  if (matched.length > 1) {
    const titled = matched.filter((workspaceId) => {
      const listed = input.properties.filter(
        (p) => p.workspaceId === workspaceId,
      );
      return Boolean(matchPropertyId(listed, [], input.haystack));
    });
    const workspaceId =
      titled.length === 1
        ? titled[0]!
        : byWorkspace.has(input.homeWorkspaceId)
          ? input.homeWorkspaceId
          : matched[0]!;
    return { workspaceId, contactId: byWorkspace.get(workspaceId) ?? null };
  }

  const home = members.has(input.homeWorkspaceId)
    ? input.homeWorkspaceId
    : (input.membershipWorkspaceIds[0] ?? input.homeWorkspaceId);
  return { workspaceId: home, contactId: null };
}

export async function resolveMailboxWorkspace(input: {
  userId: string;
  homeWorkspaceId: string;
  email?: string | null;
  phone?: string | null;
  haystack?: string;
}): Promise<{ workspaceId: string; contactId: string | null }> {
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, input.userId));
  const membershipWorkspaceIds = memberships.map((row) => row.workspaceId);
  if (membershipWorkspaceIds.length === 0) {
    return { workspaceId: input.homeWorkspaceId, contactId: null };
  }

  const [contactRows, propertyRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        workspaceId: contacts.workspaceId,
        email: contacts.email,
        phone: contacts.phone,
      })
      .from(contacts)
      .where(inArray(contacts.workspaceId, membershipWorkspaceIds)),
    db
      .select({
        id: properties.id,
        workspaceId: properties.workspaceId,
        title: properties.title,
      })
      .from(properties)
      .where(
        and(
          inArray(properties.workspaceId, membershipWorkspaceIds),
          isNull(properties.deletedAt),
        ),
      ),
  ]);

  return pickMailboxWorkspace({
    homeWorkspaceId: input.homeWorkspaceId,
    membershipWorkspaceIds,
    contacts: contactRows,
    properties: propertyRows,
    email: input.email ?? null,
    phone: input.phone ?? null,
    haystack: input.haystack ?? "",
  });
}
