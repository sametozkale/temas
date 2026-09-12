import { z } from "zod";

import {
  DOCUMENT_KINDS,
  INVENTORY_CONDITIONS,
  PROPERTY_RELATIONS,
  PROPERTY_TYPES,
} from "@/lib/db/schema/properties";
import { isValidTimezone } from "@/lib/timezones";

/** Boolean feature flags stored in `properties.features` (docs/03 §3). */
export const FEATURE_KEYS = [
  "furnished",
  "parking",
  "elevator",
  "balcony",
  "garden",
  "pets_allowed",
  "air_conditioning",
  "heating_central",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const CURRENCIES = ["TRY", "EUR", "USD", "GBP"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** "1.250,50" / "1250.50" / "" → number | null */
const optionalDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const normalized = v.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "");
    const n = Number(normalized.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "invalid_number" });
      return z.NEVER;
    }
    return n;
  });

const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "invalid_number" });
      return z.NEVER;
    }
    return n;
  });

export const propertyFormSchema = z.object({
  type: z.enum(PROPERTY_TYPES).default("apartment"),
  title: z.string().trim().min(2, "title").max(120, "title"),
  addressLine: optionalText(200),
  district: optionalText(80),
  city: optionalText(80),
  country: optionalText(80),
  timezone: z
    .string()
    .refine(isValidTimezone, "timezone")
    .default("Europe/Istanbul"),
  rentAmount: optionalDecimal,
  currency: z.enum(CURRENCIES).default("TRY"),
  depositAmount: optionalDecimal,
  areaM2: optionalDecimal,
  rooms: optionalText(20),
  floor: optionalInt,
  features: z.array(z.enum(FEATURE_KEYS)).default([]),
  description: optionalText(4000),
});

export type PropertyFormInput = z.input<typeof propertyFormSchema>;
export type PropertyFormValues = z.output<typeof propertyFormSchema>;

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "name").max(120, "name"),
  quantity: z.coerce.number().int().min(1).max(9999).default(1),
  condition: z.enum(INVENTORY_CONDITIONS).nullable().default(null),
  note: optionalText(500),
});
export type InventoryItemInput = z.input<typeof inventoryItemSchema>;

export const propertyPersonSchema = z
  .object({
    relation: z.enum(PROPERTY_RELATIONS),
    fullName: z.string().trim().min(2, "full_name").max(120, "full_name"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || z.email().safeParse(v).success, "email"),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.replace(/[^\d+]/g, "") : null))
      .refine((v) => v === null || /^\+?\d{7,15}$/.test(v), "phone"),
  })
  .refine((v) => v.email || v.phone, {
    message: "contact_required",
    path: ["email"],
  });
export type PropertyPersonInput = z.input<typeof propertyPersonSchema>;

export const documentMetaSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string().trim().min(1, "title").max(160, "title"),
  shared: z.boolean().default(false),
});
export type DocumentMetaInput = z.input<typeof documentMetaSchema>;

export const uuidSchema = z.string().uuid();

export function propertyToFormInput(p: {
  type: PropertyFormInput["type"];
  title: string;
  address: {
    line?: string;
    district?: string;
    city?: string;
    country?: string;
  } | null;
  timezone: string;
  rentAmount: string | null;
  currency: string;
  depositAmount: string | null;
  areaM2: string | null;
  rooms: string | null;
  floor: number | null;
  features: Record<string, unknown>;
  description: string | null;
}): PropertyFormInput {
  return {
    type: p.type,
    title: p.title,
    addressLine: p.address?.line ?? "",
    district: p.address?.district ?? "",
    city: p.address?.city ?? "",
    country: p.address?.country ?? "",
    timezone: p.timezone,
    rentAmount: p.rentAmount ?? "",
    currency: (CURRENCIES as readonly string[]).includes(p.currency)
      ? (p.currency as PropertyFormInput["currency"])
      : "TRY",
    depositAmount: p.depositAmount ?? "",
    areaM2: p.areaM2 ?? "",
    rooms: p.rooms ?? "",
    floor: p.floor?.toString() ?? "",
    features: FEATURE_KEYS.filter((k) => p.features?.[k] === true),
    description: p.description ?? "",
  };
}

export const EMPTY_PROPERTY_FORM: PropertyFormInput = {
  type: "apartment",
  title: "",
  addressLine: "",
  district: "",
  city: "",
  country: "Türkiye",
  timezone: "Europe/Istanbul",
  rentAmount: "",
  currency: "TRY",
  depositAmount: "",
  areaM2: "",
  rooms: "",
  floor: "",
  features: [],
  description: "",
};
