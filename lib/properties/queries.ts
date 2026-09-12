import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { Tx } from "@/lib/db";
import {
  activityLog,
  contacts,
  documents,
  inventoryItems,
  profiles,
  properties,
  propertyMedia,
  propertyPeople,
  type PropertyStatus,
  type PropertyType,
} from "@/lib/db/schema";

/**
 * Read helpers for the Properties area. All run inside `withUserContext`, so
 * RLS is the outer guard; the explicit `workspaceId` filter keeps queries
 * scoped to the active workspace when a user belongs to several.
 */

export type PropertyListFilters = {
  q?: string;
  type?: PropertyType;
  status?: PropertyStatus | "listed";
  includeArchived?: boolean;
};

const LISTED_SQL = sql`${properties.status} in ('active','viewing_in_progress','application_review','contract_pending')`;

export async function listProperties(
  tx: Tx,
  workspaceId: string,
  filters: PropertyListFilters = {},
) {
  const where: SQL[] = [
    eq(properties.workspaceId, workspaceId),
    isNull(properties.deletedAt),
  ];
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_]/g, "\\$&")}%`;
    where.push(
      or(
        ilike(properties.title, like),
        sql`${properties.address}->>'district' ilike ${like}`,
        sql`${properties.address}->>'city' ilike ${like}`,
        sql`${properties.address}->>'line' ilike ${like}`,
      )!,
    );
  }
  if (filters.type) where.push(eq(properties.type, filters.type));
  if (filters.status === "listed") where.push(LISTED_SQL);
  else if (filters.status) where.push(eq(properties.status, filters.status));
  else if (!filters.includeArchived) {
    where.push(sql`${properties.status} <> 'archived'`);
  }

  return tx
    .select({
      id: properties.id,
      title: properties.title,
      type: properties.type,
      status: properties.status,
      address: properties.address,
      rentAmount: properties.rentAmount,
      currency: properties.currency,
      areaM2: properties.areaM2,
      rooms: properties.rooms,
      updatedAt: properties.updatedAt,
      coverPath: sql<string | null>`(
        select m.storage_path from property_media m
        where m.property_id = ${properties.id}
          and (m.id = ${properties.coverMediaId} or ${properties.coverMediaId} is null)
          and m.kind = 'photo'
        order by (m.id = ${properties.coverMediaId}) desc, m.sort_order asc
        limit 1
      )`,
    })
    .from(properties)
    .where(and(...where))
    .orderBy(desc(properties.updatedAt));
}

export async function getProperty(tx: Tx, workspaceId: string, id: string) {
  const [row] = await tx
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.id, id),
        eq(properties.workspaceId, workspaceId),
        isNull(properties.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type PropertyRow = NonNullable<Awaited<ReturnType<typeof getProperty>>>;

export async function listMedia(tx: Tx, propertyId: string) {
  return tx
    .select()
    .from(propertyMedia)
    .where(eq(propertyMedia.propertyId, propertyId))
    .orderBy(asc(propertyMedia.sortOrder), asc(propertyMedia.createdAt));
}

export async function listInventory(tx: Tx, propertyId: string) {
  return tx
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.propertyId, propertyId))
    .orderBy(asc(inventoryItems.createdAt));
}

export async function listPeople(tx: Tx, propertyId: string) {
  return tx
    .select({
      id: propertyPeople.id,
      relation: propertyPeople.relation,
      inviteToken: propertyPeople.inviteToken,
      inviteExpiresAt: propertyPeople.inviteExpiresAt,
      joinedAt: propertyPeople.joinedAt,
      createdAt: propertyPeople.createdAt,
      contact: {
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        userId: contacts.userId,
      },
    })
    .from(propertyPeople)
    .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
    .where(eq(propertyPeople.propertyId, propertyId))
    .orderBy(asc(propertyPeople.relation), asc(propertyPeople.createdAt));
}

export async function listDocuments(tx: Tx, propertyId: string) {
  return tx
    .select({
      id: documents.id,
      kind: documents.kind,
      title: documents.title,
      storagePath: documents.storagePath,
      meta: documents.meta,
      createdAt: documents.createdAt,
      createdByName: profiles.fullName,
    })
    .from(documents)
    .leftJoin(profiles, eq(profiles.id, documents.createdBy))
    .where(eq(documents.propertyId, propertyId))
    .orderBy(desc(documents.createdAt));
}

export async function listActivity(tx: Tx, propertyId: string, limit = 100) {
  return tx
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entity: activityLog.entity,
      entityId: activityLog.entityId,
      data: activityLog.data,
      createdAt: activityLog.createdAt,
      actorName: profiles.fullName,
    })
    .from(activityLog)
    .leftJoin(profiles, eq(profiles.id, activityLog.actorId))
    .where(eq(activityLog.propertyId, propertyId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

/** Sidebar shortcuts: the five most recently touched properties. */
export async function recentProperties(tx: Tx, workspaceId: string, limit = 5) {
  return tx
    .select({ id: properties.id, title: properties.title })
    .from(properties)
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        isNull(properties.deletedAt),
        sql`${properties.status} <> 'archived'`,
      ),
    )
    .orderBy(desc(properties.updatedAt))
    .limit(limit);
}
