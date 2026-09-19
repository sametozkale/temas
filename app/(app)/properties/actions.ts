"use server";

import { and, eq, isNull, max, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { withUserContext, type Tx } from "@/lib/db";
import {
  contacts,
  documents,
  inventoryItems,
  properties,
  propertyMedia,
  propertyPeople,
  type PropertyStatus,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { requireAbility } from "@/lib/permissions";
import { enqueueEmbedProperty } from "@/lib/ai/enqueue";
import { revalidatePublicPropertyPages } from "@/lib/public-cache";
import { resolveAssignedUserId } from "@/lib/properties/assignment";
import { getProperty } from "@/lib/properties/queries";
import { syncAssignedAgentWindows } from "@/lib/viewings/assignee";
import {
  documentMetaSchema,
  inventoryItemSchema,
  propertyFormSchema,
  propertyPersonSchema,
  uuidSchema,
  type PropertyFormInput,
} from "@/lib/properties/schema";
import { canTransition, isPropertyStatus } from "@/lib/properties/status";
import { secureToken } from "@/lib/slug";
import {
  DOCUMENT_MAX_BYTES,
  MEDIA_MAX_BYTES,
  STORAGE_BUCKETS,
  mediaTypeOf,
  buildObjectPath,
  createSignedDownload,
  createSignedUpload,
  isPathWithin,
  removeObjects,
} from "@/lib/storage";

export type PropertyActionResult<T = undefined> = ActionResult<T>;

const PERSON_INVITE_TTL_DAYS = 14;

/** Loads the property inside the caller's context or returns null. */
async function requireProperty(tx: Tx, workspaceId: string, id: string) {
  return getProperty(tx, workspaceId, id);
}

function revalidateProperty(id: string) {
  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`, "layout");
  revalidatePath("/", "layout");
}

function toAddress(v: {
  addressLine: string | null;
  district: string | null;
  city: string | null;
  country: string | null;
}) {
  const address = {
    line: v.addressLine ?? undefined,
    district: v.district ?? undefined,
    city: v.city ?? undefined,
    country: v.country ?? undefined,
  };
  return Object.values(address).some(Boolean) ? address : null;
}

function toFeatures(keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, true]));
}

// ---------------------------------------------------------------------------
// Property CRUD
// ---------------------------------------------------------------------------

export async function createProperty(
  input: PropertyFormInput,
): Promise<PropertyActionResult<{ id: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");

  const parsed = propertyFormSchema.safeParse({
    type: "apartment",
    timezone: "Europe/Istanbul",
    currency: "TRY",
    features: [],
    ...input,
  });
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const id = await withUserContext(ctx.user.id, async (tx) => {
    const assignedUserId = await resolveAssignedUserId(
      tx,
      ctx.workspace.id,
      ctx.user.id,
      v.assignedUserId,
    );
    const [row] = await tx
      .insert(properties)
      .values({
        workspaceId: ctx.workspace.id,
        assignedUserId,
        type: v.type,
        title: v.title,
        address: toAddress(v),
        timezone: v.timezone,
        rentAmount: v.rentAmount?.toString() ?? null,
        currency: v.currency,
        depositAmount: v.depositAmount?.toString() ?? null,
        duesAmount: v.duesAmount?.toString() ?? null,
        areaM2: v.areaM2?.toString() ?? null,
        rooms: v.rooms,
        bedrooms: v.bedrooms,
        bathrooms: v.bathrooms,
        floor: v.floor,
        totalFloors: v.totalFloors,
        yearBuilt: v.yearBuilt,
        condition: v.condition,
        availableFrom: v.availableFrom,
        features: toFeatures(v.features),
        description: v.description,
      })
      .returning({ id: properties.id });
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: row!.id,
        action: "property.created",
        entity: "property",
        entityId: row!.id,
        data: { title: v.title, type: v.type, assignedUserId },
      },
      tx,
    );
    return row!.id;
  });

  try {
    await enqueueEmbedProperty(id);
  } catch {
    // embeddings are best-effort
  }

  revalidateProperty(id);
  return actionOk({ id });
}

export async function updateProperty(
  propertyId: string,
  input: PropertyFormInput,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);

  const parsed = propertyFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return "not_found" as const;

    const assignedUserId = await resolveAssignedUserId(
      tx,
      ctx.workspace.id,
      current.assignedUserId ?? ctx.user.id,
      v.assignedUserId,
    );

    await tx
      .update(properties)
      .set({
        type: v.type,
        title: v.title,
        address: toAddress(v),
        timezone: v.timezone,
        rentAmount: v.rentAmount?.toString() ?? null,
        currency: v.currency,
        depositAmount: v.depositAmount?.toString() ?? null,
        duesAmount: v.duesAmount?.toString() ?? null,
        areaM2: v.areaM2?.toString() ?? null,
        rooms: v.rooms,
        bedrooms: v.bedrooms,
        bathrooms: v.bathrooms,
        floor: v.floor,
        totalFloors: v.totalFloors,
        yearBuilt: v.yearBuilt,
        condition: v.condition,
        availableFrom: v.availableFrom,
        features: toFeatures(v.features),
        description: v.description,
        assignedUserId,
      })
      .where(eq(properties.id, id));

    if (current.assignedUserId !== assignedUserId) {
      await syncAssignedAgentWindows(tx, id, ctx.workspace.id, assignedUserId);
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId: id,
          action: "property.assigned",
          entity: "property",
          entityId: id,
          data: { from: current.assignedUserId, to: assignedUserId },
        },
        tx,
      );
    }

    const changed: string[] = [];
    if (current.title !== v.title) changed.push("title");
    if (current.type !== v.type) changed.push("type");
    if ((current.rentAmount ?? null) !== (v.rentAmount?.toString() ?? null))
      changed.push("rent_amount");
    if (
      (current.depositAmount ?? null) !== (v.depositAmount?.toString() ?? null)
    )
      changed.push("deposit_amount");
    if ((current.duesAmount ?? null) !== (v.duesAmount?.toString() ?? null))
      changed.push("dues_amount");
    if (current.bedrooms !== v.bedrooms) changed.push("bedrooms");
    if (current.bathrooms !== v.bathrooms) changed.push("bathrooms");
    if (current.totalFloors !== v.totalFloors) changed.push("total_floors");
    if (current.yearBuilt !== v.yearBuilt) changed.push("year_built");
    if (current.condition !== v.condition) changed.push("condition");
    if ((current.availableFrom ?? null) !== (v.availableFrom ?? null))
      changed.push("available_from");

    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "property.updated",
        entity: "property",
        entityId: id,
        data: { changed },
      },
      tx,
    );
    return "ok" as const;
  });

  if (result === "not_found") return actionError("not_found");
  try {
    await enqueueEmbedProperty(id);
  } catch {
    // embeddings are best-effort
  }
  revalidateProperty(id);
  await revalidatePublicPropertyPages(id);
  return actionOk();
}

export async function changePropertyStatus(
  propertyId: string,
  status: PropertyStatus,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  if (!isPropertyStatus(status)) return actionError("invalid");

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return "not_found" as const;
    if (!canTransition(current.status, status)) {
      return "invalid_transition" as const;
    }
    await tx.update(properties).set({ status }).where(eq(properties.id, id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "property.status_changed",
        entity: "property",
        entityId: id,
        data: { from: current.status, to: status },
      },
      tx,
    );
    return "ok" as const;
  });

  if (result !== "ok") return actionError(result);
  revalidateProperty(id);
  return actionOk();
}

/** Soft delete (docs/03 header). Owner / agent only. */
export async function deleteProperty(
  propertyId: string,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.delete");
  const id = uuidSchema.parse(propertyId);

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return "not_found" as const;
    await tx
      .update(properties)
      .set({ deletedAt: new Date() })
      .where(eq(properties.id, id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "property.deleted",
        entity: "property",
        entityId: id,
        data: { title: current.title },
      },
      tx,
    );
    return "ok" as const;
  });

  if (result !== "ok") return actionError(result);
  revalidateProperty(id);
  await revalidatePublicPropertyPages(id);
  redirect("/properties");
}

// ---------------------------------------------------------------------------
// Media (photos)
// ---------------------------------------------------------------------------

const uploadRequestSchema = z.object({
  propertyId: uuidSchema,
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export async function createMediaUploadUrl(
  input: z.input<typeof uploadRequestSchema>,
): Promise<PropertyActionResult<{ path: string; token: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { propertyId, fileName, contentType, size } = parsed.data;

  const mime = mediaTypeOf(contentType, fileName);
  if (!mime) return actionError("unsupported_type");
  if (size > MEDIA_MAX_BYTES) return actionError("too_large");

  const exists = await withUserContext(ctx.user.id, (tx) =>
    requireProperty(tx, ctx.workspace.id, propertyId),
  );
  if (!exists) return actionError("not_found");

  const path = buildObjectPath(ctx.workspace.id, propertyId, fileName);
  try {
    const signed = await createSignedUpload(STORAGE_BUCKETS.media, path);
    return actionOk(signed);
  } catch (err) {
    console.error("[media] signed upload url failed", err);
    return actionError("upload_failed");
  }
}

export async function attachMedia(
  propertyId: string,
  storagePath: string,
): Promise<PropertyActionResult<{ id: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  if (!isPathWithin(storagePath, ctx.workspace.id, id)) {
    return actionError("invalid");
  }

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return null;
    const [agg] = await tx
      .select({
        next: sql<number>`coalesce(${max(propertyMedia.sortOrder)}, -1) + 1`,
      })
      .from(propertyMedia)
      .where(eq(propertyMedia.propertyId, id));
    const [row] = await tx
      .insert(propertyMedia)
      .values({
        propertyId: id,
        storagePath,
        kind: "photo",
        sortOrder: Number(agg?.next ?? 0),
      })
      .returning({ id: propertyMedia.id });
    if (!current.coverMediaId) {
      await tx
        .update(properties)
        .set({ coverMediaId: row!.id })
        .where(eq(properties.id, id));
    }
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "media.added",
        entity: "property_media",
        entityId: row!.id,
      },
      tx,
    );
    return row!.id;
  });

  if (!result) return actionError("not_found");
  revalidateProperty(id);
  return actionOk({ id: result });
}

export async function removeMedia(
  propertyId: string,
  mediaId: string,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const mid = uuidSchema.parse(mediaId);

  const removed = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return null;
    const [row] = await tx
      .delete(propertyMedia)
      .where(and(eq(propertyMedia.id, mid), eq(propertyMedia.propertyId, id)))
      .returning({ storagePath: propertyMedia.storagePath });
    if (!row) return null;
    if (current.coverMediaId === mid) {
      const [nextCover] = await tx
        .select({ id: propertyMedia.id })
        .from(propertyMedia)
        .where(eq(propertyMedia.propertyId, id))
        .orderBy(propertyMedia.sortOrder)
        .limit(1);
      await tx
        .update(properties)
        .set({ coverMediaId: nextCover?.id ?? null })
        .where(eq(properties.id, id));
    }
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "media.removed",
        entity: "property_media",
        entityId: mid,
      },
      tx,
    );
    return row.storagePath;
  });

  if (!removed) return actionError("not_found");
  await removeObjects(STORAGE_BUCKETS.media, [removed]);
  revalidateProperty(id);
  return actionOk();
}

export async function reorderMedia(
  propertyId: string,
  orderedIds: string[],
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const ids = z.array(uuidSchema).min(1).max(200).parse(orderedIds);

  await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return;
    for (const [index, mediaId] of ids.entries()) {
      await tx
        .update(propertyMedia)
        .set({ sortOrder: index })
        .where(
          and(eq(propertyMedia.id, mediaId), eq(propertyMedia.propertyId, id)),
        );
    }
  });

  revalidateProperty(id);
  return actionOk();
}

export async function setCoverMedia(
  propertyId: string,
  mediaId: string,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const mid = uuidSchema.parse(mediaId);

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const [media] = await tx
      .select({ id: propertyMedia.id })
      .from(propertyMedia)
      .where(and(eq(propertyMedia.id, mid), eq(propertyMedia.propertyId, id)))
      .limit(1);
    if (!media) return false;
    await tx
      .update(properties)
      .set({ coverMediaId: mid })
      .where(
        and(
          eq(properties.id, id),
          eq(properties.workspaceId, ctx.workspace.id),
        ),
      );
    return true;
  });

  if (!ok) return actionError("not_found");
  revalidateProperty(id);
  return actionOk();
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function saveInventoryItem(
  propertyId: string,
  itemId: string | null,
  _prev: PropertyActionResult | undefined,
  formData: FormData,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const existingId = itemId ? uuidSchema.parse(itemId) : null;

  const parsed = inventoryItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity") || undefined,
    condition: formData.get("condition") || null,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return "not_found" as const;

    if (existingId) {
      const [row] = await tx
        .update(inventoryItems)
        .set(v)
        .where(
          and(
            eq(inventoryItems.id, existingId),
            eq(inventoryItems.propertyId, id),
          ),
        )
        .returning({ id: inventoryItems.id });
      if (!row) return "not_found" as const;
    } else {
      await tx.insert(inventoryItems).values({ propertyId: id, ...v });
    }

    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: existingId ? "inventory.updated" : "inventory.added",
        entity: "inventory_item",
        entityId: existingId,
        data: { name: v.name, quantity: v.quantity },
      },
      tx,
    );
    return "ok" as const;
  });

  if (result !== "ok") return actionError(result);
  revalidateProperty(id);
  return actionOk();
}

export async function deleteInventoryItem(
  propertyId: string,
  itemId: string,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const iid = uuidSchema.parse(itemId);

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return false;
    const [row] = await tx
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, iid), eq(inventoryItems.propertyId, id)))
      .returning({ name: inventoryItems.name });
    if (!row) return false;
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "inventory.removed",
        entity: "inventory_item",
        entityId: iid,
        data: { name: row.name },
      },
      tx,
    );
    return true;
  });

  if (!ok) return actionError("not_found");
  revalidateProperty(id);
  return actionOk();
}

// ---------------------------------------------------------------------------
// People (owner / current tenant)
// ---------------------------------------------------------------------------

export async function addPropertyPerson(
  propertyId: string,
  _prev: PropertyActionResult | undefined,
  formData: FormData,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  requireAbility(ctx.membership, "contacts.write");
  const id = uuidSchema.parse(propertyId);

  const parsed = propertyPersonSchema.safeParse({
    relation: formData.get("relation"),
    fullName: formData.get("fullName"),
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, id);
    if (!current) return "not_found" as const;

    // Reuse an existing contact matched by email or phone (docs/03 §2 uniques).
    const matchers = [
      v.email ? eq(contacts.email, v.email) : null,
      v.phone ? eq(contacts.phone, v.phone) : null,
    ].filter((m): m is NonNullable<typeof m> => m !== null);
    const [existing] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, ctx.workspace.id), or(...matchers)))
      .limit(1);

    let contactId = existing?.id;
    if (contactId) {
      await tx
        .update(contacts)
        .set({
          fullName: v.fullName,
          email: v.email ?? undefined,
          phone: v.phone ?? undefined,
        })
        .where(eq(contacts.id, contactId));
    } else {
      const [created] = await tx
        .insert(contacts)
        .values({
          workspaceId: ctx.workspace.id,
          fullName: v.fullName,
          email: v.email,
          phone: v.phone,
        })
        .returning({ id: contacts.id });
      contactId = created!.id;
    }

    const [dup] = await tx
      .select({ id: propertyPeople.id })
      .from(propertyPeople)
      .where(
        and(
          eq(propertyPeople.propertyId, id),
          eq(propertyPeople.contactId, contactId),
          eq(propertyPeople.relation, v.relation),
        ),
      )
      .limit(1);
    if (dup) return "duplicate" as const;

    const [link] = await tx
      .insert(propertyPeople)
      .values({ propertyId: id, contactId, relation: v.relation })
      .returning({ id: propertyPeople.id });

    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "person.linked",
        entity: "property_person",
        entityId: link!.id,
        data: { relation: v.relation, fullName: v.fullName },
      },
      tx,
    );
    return "ok" as const;
  });

  if (result !== "ok") return actionError(result);
  revalidateProperty(id);
  return actionOk();
}

export async function removePropertyPerson(
  propertyId: string,
  personId: string,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const pid = uuidSchema.parse(personId);

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .delete(propertyPeople)
      .where(and(eq(propertyPeople.id, pid), eq(propertyPeople.propertyId, id)))
      .returning({ relation: propertyPeople.relation });
    if (!row) return false;
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "person.unlinked",
        entity: "property_person",
        entityId: pid,
        data: { relation: row.relation },
      },
      tx,
    );
    return true;
  });

  if (!ok) return actionError("not_found");
  revalidateProperty(id);
  return actionOk();
}

/**
 * Issues (or refreshes) the invite token for an owner/tenant and returns the
 * shareable URL. The person opens `/p/[token]` and sets their availability.
 */
export async function generatePersonInviteLink(
  propertyId: string,
  personId: string,
): Promise<PropertyActionResult<{ url: string; expiresAt: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const pid = uuidSchema.parse(personId);

  const token = secureToken();
  const expiresAt = new Date(Date.now() + PERSON_INVITE_TTL_DAYS * 86_400_000);

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .update(propertyPeople)
      .set({ inviteToken: token, inviteExpiresAt: expiresAt })
      .where(
        and(
          eq(propertyPeople.id, pid),
          eq(propertyPeople.propertyId, id),
          isNull(propertyPeople.joinedAt),
        ),
      )
      .returning({ relation: propertyPeople.relation });
    if (!row) return false;
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "person.invite_link_created",
        entity: "property_person",
        entityId: pid,
        data: { relation: row.relation },
      },
      tx,
    );
    return true;
  });

  if (!ok) return actionError("not_found");
  revalidateProperty(id);
  const url = new URL(`/p/${token}`, env().APP_URL).toString();
  return actionOk({ url, expiresAt: expiresAt.toISOString() });
}

// ---------------------------------------------------------------------------
// Documents (Files tab)
// ---------------------------------------------------------------------------

export async function createDocumentUploadUrl(
  input: z.input<typeof uploadRequestSchema>,
): Promise<PropertyActionResult<{ path: string; token: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { propertyId, fileName, size } = parsed.data;
  if (size > DOCUMENT_MAX_BYTES) return actionError("too_large");

  const exists = await withUserContext(ctx.user.id, (tx) =>
    requireProperty(tx, ctx.workspace.id, propertyId),
  );
  if (!exists) return actionError("not_found");

  const path = buildObjectPath(ctx.workspace.id, propertyId, fileName);
  const signed = await createSignedUpload(STORAGE_BUCKETS.documents, path);
  return actionOk(signed);
}

const attachDocumentSchema = z.object({
  propertyId: uuidSchema,
  storagePath: z.string().min(1),
  originalName: z.string().max(255),
  contentType: z.string().max(100),
  size: z.number().int().nonnegative(),
  kind: documentMetaSchema.shape.kind,
  title: documentMetaSchema.shape.title,
  shared: z.boolean().default(false),
});

export async function attachDocument(
  input: z.input<typeof attachDocumentSchema>,
): Promise<PropertyActionResult<{ id: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const parsed = attachDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;
  if (!isPathWithin(v.storagePath, ctx.workspace.id, v.propertyId)) {
    return actionError("invalid");
  }

  const docId = await withUserContext(ctx.user.id, async (tx) => {
    const current = await requireProperty(tx, ctx.workspace.id, v.propertyId);
    if (!current) return null;
    const [row] = await tx
      .insert(documents)
      .values({
        propertyId: v.propertyId,
        kind: v.kind,
        title: v.title,
        storagePath: v.storagePath,
        createdBy: ctx.user.id,
        meta: {
          shared: v.shared,
          size: v.size,
          contentType: v.contentType,
          originalName: v.originalName,
        },
      })
      .returning({ id: documents.id });
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: v.propertyId,
        action: "document.uploaded",
        entity: "document",
        entityId: row!.id,
        data: { title: v.title, kind: v.kind, shared: v.shared },
      },
      tx,
    );
    return row!.id;
  });

  if (!docId) return actionError("not_found");
  revalidateProperty(v.propertyId);
  return actionOk({ id: docId });
}

export async function toggleDocumentShared(
  propertyId: string,
  documentId: string,
  shared: boolean,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const did = uuidSchema.parse(documentId);

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .update(documents)
      .set({
        meta: sql`${documents.meta} || ${JSON.stringify({ shared })}::jsonb`,
      })
      .where(and(eq(documents.id, did), eq(documents.propertyId, id)))
      .returning({ title: documents.title });
    if (!row) return false;
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: shared ? "document.shared" : "document.unshared",
        entity: "document",
        entityId: did,
        data: { title: row.title },
      },
      tx,
    );
    return true;
  });

  if (!ok) return actionError("not_found");
  revalidateProperty(id);
  return actionOk();
}

export async function deleteDocument(
  propertyId: string,
  documentId: string,
): Promise<PropertyActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const id = uuidSchema.parse(propertyId);
  const did = uuidSchema.parse(documentId);

  const path = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .delete(documents)
      .where(and(eq(documents.id, did), eq(documents.propertyId, id)))
      .returning({
        storagePath: documents.storagePath,
        title: documents.title,
      });
    if (!row) return null;
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "document.deleted",
        entity: "document",
        entityId: did,
        data: { title: row.title },
      },
      tx,
    );
    return row.storagePath;
  });

  if (!path) return actionError("not_found");
  await removeObjects(STORAGE_BUCKETS.documents, [path]);
  revalidateProperty(id);
  return actionOk();
}

export async function getDocumentDownloadUrl(
  propertyId: string,
  documentId: string,
): Promise<PropertyActionResult<{ url: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.read");
  const id = uuidSchema.parse(propertyId);
  const did = uuidSchema.parse(documentId);

  const doc = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({ storagePath: documents.storagePath, meta: documents.meta })
      .from(documents)
      .where(and(eq(documents.id, did), eq(documents.propertyId, id)))
      .limit(1);
    return row ?? null;
  });
  if (!doc) return actionError("not_found");

  const url = await createSignedDownload(
    STORAGE_BUCKETS.documents,
    doc.storagePath,
    { download: doc.meta.originalName ?? true },
  );
  return actionOk({ url });
}
