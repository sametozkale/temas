import { tool } from "ai";
import { z } from "zod";

import {
  addPropertyPerson,
  attachDocument,
  attachMedia,
  changePropertyStatus,
  createProperty,
  deleteDocument,
  deleteInventoryItem,
  generatePersonInviteLink,
  patchProperty,
  removeMedia,
  removePropertyPerson,
  saveInventoryItem,
  setCoverMedia,
  toggleDocumentShared,
} from "@/app/(app)/properties/actions";
import { withUserContext } from "@/lib/db";
import {
  DOCUMENT_KINDS,
  INVENTORY_CONDITIONS,
  PROPERTY_CONDITIONS,
  PROPERTY_RELATIONS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/db/schema/properties";
import {
  downloadListingImage,
  LISTING_IMAGE_LIMIT,
  previewListingImport,
} from "@/lib/properties/import-listing";
import { deletePropertyCore } from "@/lib/properties/mutations";
import { getProperty } from "@/lib/properties/queries";
import {
  FEATURE_KEYS,
  propertyToFormInput,
  type PropertyFormInput,
} from "@/lib/properties/schema";
import {
  buildObjectPath,
  DOCUMENT_MAX_BYTES,
  MEDIA_MAX_BYTES,
  mediaTypeOf,
  STORAGE_BUCKETS,
  uploadBuffer,
} from "@/lib/storage";

import { fail, formOf, fromResult, write, type ActionScope } from "./run";

/** Accepts "2000", 2000 or null from the model; the form schema does the rest. */
const text = z
  .union([z.string(), z.number()])
  .nullable()
  .transform((v) => (v === null ? "" : String(v)));

const editableFields = {
  type: z.enum(PROPERTY_TYPES),
  title: z.string().min(2).max(120),
  addressLine: text,
  district: text,
  city: text,
  country: text,
  timezone: z.string(),
  rentAmount: text,
  currency: z.string().length(3),
  depositAmount: text,
  duesAmount: text,
  summerUtilitiesAmount: text,
  winterUtilitiesAmount: text,
  areaM2: text,
  rooms: text,
  bedrooms: text,
  bathrooms: text,
  floor: text,
  totalFloors: text,
  yearBuilt: text,
  condition: z.enum(PROPERTY_CONDITIONS).or(z.literal("none")),
  availableFrom: text.describe("YYYY-MM-DD or empty"),
  features: z.array(z.enum(FEATURE_KEYS)),
  description: text,
  assignedUserId: z.string().uuid().or(z.literal("")),
};

const fieldsSchema = z.object(editableFields).partial();

type FieldKey = keyof typeof editableFields;

const IMAGE_CONCURRENCY = 4;

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

function display(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  return String(value);
}

function toFormPatch(fields: z.output<typeof fieldsSchema>) {
  return fields as Partial<PropertyFormInput>;
}

function decodeDataUrl(url: string) {
  const m = url.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!m) return null;
  const body = m[2]
    ? Buffer.from(m[3]!, "base64")
    : Buffer.from(decodeURIComponent(m[3]!), "utf8");
  return { contentType: m[1]!.toLowerCase(), body };
}

export function propertyTools(scope: ActionScope) {
  const { ctx } = scope;
  const href = (id: string, tab = "") => `/properties/${id}${tab}`;

  /** Uploads run in parallel; attaching keeps page order so the first photo is the cover. */
  async function importImages(propertyId: string, urls: string[]) {
    const list = urls.slice(0, LISTING_IMAGE_LIMIT);
    const uploaded: (string | null)[] = new Array(list.length).fill(null);
    let next = 0;
    async function worker() {
      while (next < list.length) {
        const index = next++;
        const url = list[index]!;
        try {
          const image = await downloadListingImage(url);
          const path = buildObjectPath(
            ctx.workspace.id,
            propertyId,
            `photo.${image.extension}`,
          );
          await uploadBuffer(STORAGE_BUCKETS.media, path, image.body, image.contentType);
          uploaded[index] = path;
        } catch (error) {
          console.warn("[listing-import] image skipped", url, error);
        }
      }
    }
    await Promise.all(Array.from({ length: IMAGE_CONCURRENCY }, worker));
    let attached = 0;
    for (const path of uploaded) {
      if (path && (await attachMedia(propertyId, path)).ok) attached += 1;
    }
    return attached;
  }

  return {
    previewListingImport: tool({
      description:
        "Read a listing page URL (or pasted listing text) and draft property fields plus photo URLs. Does not save anything. Follow with createProperty using the returned fields and imageUrls so the agent can confirm.",
      inputSchema: z
        .object({
          url: z.string().url().optional(),
          text: z.string().max(20_000).optional(),
        })
        .refine((v) => v.url || v.text, { message: "url_or_text" }),
      execute: async (input) => {
        const res = await previewListingImport(input);
        if (!res.ok) return fail(res.error);
        scope.charges.listingImport += 1;
        return { ok: true as const, ...res.preview };
      },
    }),

    createProperty: tool({
      description:
        "Create a new property (listing). Needs confirmation. Pass imageUrls from previewListingImport to import photos; the first becomes the cover.",
      inputSchema: fieldsSchema.required({ title: true }).extend({
        imageUrls: z.array(z.string().url()).max(LISTING_IMAGE_LIMIT).optional(),
        sourceUrl: z.string().url().optional(),
      }),
      execute: async ({ imageUrls, sourceUrl, ...fields }) =>
        write(scope, async () => {
          const res = await createProperty(toFormPatch(fields) as PropertyFormInput);
          if (!res.ok || !res.data) return fail(res.ok ? "failed" : res.error, res.ok ? undefined : res.fieldErrors);
          const id = res.data.id;
          const requested = imageUrls?.length ?? 0;
          const photos = requested ? await importImages(id, imageUrls!) : 0;
          const skipped = requested - photos;
          return {
            ok: true,
            summary: `Created property "${fields.title}"${photos ? ` with ${plural(photos, "photo")}` : ""}${skipped ? `; ${plural(skipped, "photo")} could not be imported` : ""}${sourceUrl ? ` from ${sourceUrl}` : ""}.`,
            href: href(id),
            hrefLabel: fields.title,
            data: { propertyId: id, photos, skipped },
          };
        }),
    }),

    updatePropertyFields: tool({
      description:
        "Change one or more fields of an existing property (rent, deposit, address, rooms, description, features, assignee, …). Only send the fields that change. Amounts are plain numbers.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        fields: fieldsSchema,
      }),
      execute: async ({ propertyId, fields }) =>
        write(scope, async () => {
          const current = await withUserContext(ctx.user.id, (tx) =>
            getProperty(tx, ctx.workspace.id, propertyId),
          );
          if (!current) return fail("not_found");
          const before = propertyToFormInput(current);
          const res = await patchProperty(propertyId, toFormPatch(fields));
          const changes = (Object.keys(fields) as FieldKey[]).map((field) => ({
            field,
            before: display(before[field]),
            after: display(fields[field]),
          }));
          return fromResult(res, {
            summary: `Updated ${changes.map((c) => c.field).join(", ")} on "${current.title}".`,
            href: href(propertyId),
            hrefLabel: current.title,
            changes,
          });
        }),
    }),

    changePropertyStatus: tool({
      description: "Move a property to another lifecycle status.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        status: z.enum(PROPERTY_STATUSES),
      }),
      execute: async ({ propertyId, status }) =>
        write(scope, async () =>
          fromResult(await changePropertyStatus(propertyId, status), {
            summary: `Status set to ${status}.`,
            href: href(propertyId),
          }),
        ),
    }),

    deleteProperty: tool({
      description: "Delete (archive out of sight) a property. Needs confirmation.",
      inputSchema: z.object({ propertyId: z.string().uuid() }),
      execute: async ({ propertyId }) =>
        write(scope, async () => {
          const res = await deletePropertyCore(ctx, propertyId);
          return fromResult(res, {
            summary: `Deleted "${res.ok ? res.data?.title : ""}".`,
            href: "/properties",
          });
        }),
    }),

    saveInventoryItem: tool({
      description:
        "Add an inventory item to a property, or update one when itemId is given.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        itemId: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(9999).optional(),
        condition: z.enum(INVENTORY_CONDITIONS).optional(),
        note: z.string().max(500).optional(),
      }),
      execute: async ({ propertyId, itemId, name, quantity, condition, note }) =>
        write(scope, async () =>
          fromResult(
            await saveInventoryItem(
              propertyId,
              itemId ?? null,
              undefined,
              formOf({
                name,
                quantity: quantity?.toString(),
                condition,
                note,
              }),
            ),
            {
              summary: `${itemId ? "Updated" : "Added"} inventory item "${name}".`,
              href: href(propertyId, "/inventory"),
            },
          ),
        ),
    }),

    deleteInventoryItem: tool({
      description: "Remove an inventory item. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        itemId: z.string().uuid(),
      }),
      execute: async ({ propertyId, itemId }) =>
        write(scope, async () =>
          fromResult(await deleteInventoryItem(propertyId, itemId), {
            summary: "Inventory item removed.",
            href: href(propertyId, "/inventory"),
          }),
        ),
    }),

    addPropertyPerson: tool({
      description:
        "Link an owner or current tenant to a property (creates or reuses the contact). Needs an email or phone.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        relation: z.enum(PROPERTY_RELATIONS),
        fullName: z.string().min(2).max(120),
        email: z.string().email().optional(),
        phone: z.string().max(32).optional(),
      }),
      execute: async ({ propertyId, relation, fullName, email, phone }) =>
        write(scope, async () =>
          fromResult(
            await addPropertyPerson(
              propertyId,
              undefined,
              formOf({ relation, fullName, email, phone }),
            ),
            {
              summary: `Linked ${fullName} as ${relation.replace("_", " ")}.`,
              href: href(propertyId, "/people"),
            },
          ),
        ),
    }),

    removePropertyPerson: tool({
      description:
        "Unlink an owner or tenant from a property (personId from getPropertyDetail). Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        personId: z.string().uuid(),
      }),
      execute: async ({ propertyId, personId }) =>
        write(scope, async () =>
          fromResult(await removePropertyPerson(propertyId, personId), {
            summary: "Person unlinked from the property.",
            href: href(propertyId, "/people"),
          }),
        ),
    }),

    createPersonInviteLink: tool({
      description:
        "Create a 14-day invite link so an owner or tenant can enter their availability. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        personId: z.string().uuid(),
      }),
      execute: async ({ propertyId, personId }) =>
        write(scope, async () => {
          const res = await generatePersonInviteLink(propertyId, personId);
          return fromResult(res, {
            summary: "Invite link is ready.",
            href: href(propertyId, "/people"),
            url: res.ok ? res.data?.url : undefined,
          });
        }),
    }),

    setCoverPhoto: tool({
      description: "Make one photo the cover of a property.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        mediaId: z.string().uuid(),
      }),
      execute: async ({ propertyId, mediaId }) =>
        write(scope, async () =>
          fromResult(await setCoverMedia(propertyId, mediaId), {
            summary: "Cover photo updated.",
            href: href(propertyId),
          }),
        ),
    }),

    removePhoto: tool({
      description: "Delete one property photo. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        mediaId: z.string().uuid(),
      }),
      execute: async ({ propertyId, mediaId }) =>
        write(scope, async () =>
          fromResult(await removeMedia(propertyId, mediaId), {
            summary: "Photo removed.",
            href: href(propertyId),
          }),
        ),
    }),

    setDocumentShared: tool({
      description:
        "Share a property document with the owner/tenant portal, or stop sharing it. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        documentId: z.string().uuid(),
        shared: z.boolean(),
      }),
      execute: async ({ propertyId, documentId, shared }) =>
        write(scope, async () =>
          fromResult(await toggleDocumentShared(propertyId, documentId, shared), {
            summary: shared ? "Document is now shared." : "Document is no longer shared.",
            href: href(propertyId, "/files"),
          }),
        ),
    }),

    deleteDocument: tool({
      description: "Delete a property document. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        documentId: z.string().uuid(),
      }),
      execute: async ({ propertyId, documentId }) =>
        write(scope, async () =>
          fromResult(await deleteDocument(propertyId, documentId), {
            summary: "Document deleted.",
            href: href(propertyId, "/files"),
          }),
        ),
    }),

    attachChatFiles: tool({
      description:
        "Save the files the agent attached in this chat to a property: images become photos, other files become documents. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        documentKind: z.enum(DOCUMENT_KINDS).optional().describe("Kind for non-image files"),
      }),
      execute: async ({ propertyId, documentKind }) =>
        write(scope, async () => {
          if (scope.files.length === 0) return fail("no_files");
          let photos = 0;
          let docs = 0;
          for (const file of scope.files) {
            const decoded = decodeDataUrl(file.url);
            if (!decoded) continue;
            const name = file.filename ?? "attachment";
            const mime = mediaTypeOf(decoded.contentType, name);
            if (mime && decoded.body.byteLength <= MEDIA_MAX_BYTES) {
              const path = buildObjectPath(ctx.workspace.id, propertyId, name);
              await uploadBuffer(STORAGE_BUCKETS.media, path, decoded.body, mime);
              if ((await attachMedia(propertyId, path)).ok) photos += 1;
              continue;
            }
            if (decoded.body.byteLength > DOCUMENT_MAX_BYTES) continue;
            const path = buildObjectPath(ctx.workspace.id, propertyId, name);
            await uploadBuffer(
              STORAGE_BUCKETS.documents,
              path,
              decoded.body,
              decoded.contentType,
            );
            const res = await attachDocument({
              propertyId,
              storagePath: path,
              originalName: name.slice(0, 255),
              contentType: decoded.contentType.slice(0, 100),
              size: decoded.body.byteLength,
              kind: documentKind ?? "other",
              title: name.slice(0, 160),
              shared: false,
            });
            if (res.ok) docs += 1;
          }
          if (photos + docs === 0) return fail("no_files");
          return {
            ok: true,
            summary: `Saved ${plural(photos, "photo")} and ${plural(docs, "document")} to the property.`,
            href: href(propertyId, docs ? "/files" : ""),
          };
        }),
    }),
  };
}
