import { generateObject } from "ai";
import { z } from "zod";

import { isTextConfigured, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import { PROPERTY_CONDITIONS, PROPERTY_TYPES } from "@/lib/db/schema/properties";
import { FEATURE_KEYS } from "@/lib/properties/schema";
import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";

/** Listing page → property form draft (docs/05 §2.6). */

export const LISTING_PAGE_MAX_BYTES = 3 * 1024 * 1024;
export const LISTING_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGE_LIMIT = 12;
const TEXT_LIMIT = 18_000;

export const listingDraftSchema = z.object({
  type: z.enum(PROPERTY_TYPES),
  title: z.string().min(2).max(120),
  addressLine: z.string().max(200).optional(),
  district: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  rentAmount: z.string().max(40).optional(),
  currency: z.string().length(3).optional(),
  depositAmount: z.string().max(40).optional(),
  duesAmount: z.string().max(40).optional(),
  areaM2: z.string().max(40).optional(),
  rooms: z.string().max(20).optional(),
  bedrooms: z.string().max(4).optional(),
  bathrooms: z.string().max(4).optional(),
  floor: z.string().max(4).optional(),
  totalFloors: z.string().max(4).optional(),
  yearBuilt: z.string().max(4).optional(),
  condition: z.enum(PROPERTY_CONDITIONS).optional(),
  availableFrom: z.string().max(10).optional(),
  features: z.array(z.enum(FEATURE_KEYS)).default([]),
  description: z.string().max(4000).optional(),
});
export type ListingDraft = z.infer<typeof listingDraftSchema>;

const extractionSchema = z.object({
  listing: listingDraftSchema,
  missing: z.array(z.string()).max(20),
});

export type ListingPreview = {
  sourceUrl: string | null;
  fields: ListingDraft;
  missing: string[];
  imageUrls: string[];
};

type PageSignals = {
  title: string | null;
  description: string | null;
  jsonLd: unknown[];
  images: string[];
  text: string;
};

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

function metaContent(html: string, key: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  const v = m?.[1] ?? m?.[2];
  return v ? decodeEntities(v).trim() : null;
}

function absolute(src: string, base: URL) {
  try {
    const url = new URL(decodeEntities(src), base);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function jsonLdImages(node: unknown, out: string[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => jsonLdImages(n, out));
    return;
  }
  const record = node as Record<string, unknown>;
  const image = record.image ?? record.photo;
  const push = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string") {
      out.push((v as { url: string }).url);
    }
  };
  if (Array.isArray(image)) image.forEach(push);
  else push(image);
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") jsonLdImages(value, out);
  }
}

export function readPageSignals(html: string, base: URL): PageSignals {
  const jsonLd: unknown[] = [];
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      jsonLd.push(JSON.parse(m[1]!.trim()));
    } catch {
      // ignore malformed blocks
    }
  }

  const candidates: string[] = [];
  const og = metaContent(html, "og:image");
  if (og) candidates.push(og);
  jsonLdImages(jsonLd, candidates);
  for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi)) {
    const src = m[1]!;
    if (/sprite|logo|icon|avatar|pixel|placeholder|\.svg(\?|$)|\.gif(\?|$)/i.test(src)) continue;
    candidates.push(src);
  }
  const images = [
    ...new Set(
      candidates
        .map((src) => absolute(src, base))
        .filter((v): v is string => v !== null),
    ),
  ].slice(0, LISTING_IMAGE_LIMIT * 2);

  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, TEXT_LIMIT);

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return {
    title: metaContent(html, "og:title") ?? (titleTag ? decodeEntities(titleTag).trim() : null),
    description:
      metaContent(html, "og:description") ?? metaContent(html, "description"),
    jsonLd,
    images,
    text,
  };
}

const LISTING_TYPES = new Set([
  "apartment",
  "house",
  "singlefamilyresidence",
  "residence",
  "accommodation",
  "realestatelisting",
  "product",
  "offer",
  "room",
  "suite",
]);

/** Fields a listing card should have; anything absent is reported as missing. */
export const LISTING_KEY_FIELDS = [
  "rentAmount",
  "addressLine",
  "city",
  "areaM2",
  "bedrooms",
] as const;

function nodesOf(value: unknown, out: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach((v) => nodesOf(v, out));
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    out.push(record);
    for (const v of Object.values(record)) {
      if (v && typeof v === "object") nodesOf(v, out);
    }
  }
  return out;
}

function typesOf(node: Record<string, unknown>) {
  const raw = node["@type"];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase());
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return decodeEntities(value).trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && "value" in value) {
    return str((value as { value: unknown }).value);
  }
  return undefined;
}

function digits(value: string | undefined, max: number) {
  const n = value?.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".");
  return n && n.length <= max ? n : undefined;
}

/** schema.org listing fields straight from JSON-LD, no model needed. */
export function jsonLdListing(jsonLd: unknown[]): Partial<ListingDraft> {
  const nodes = nodesOf(jsonLd);
  const listing = nodes.find((n) => typesOf(n).some((t) => LISTING_TYPES.has(t)));
  if (!listing) return {};
  const offer = nodes.find(
    (n) => typesOf(n).includes("offer") || ("price" in n && "priceCurrency" in n),
  );
  const address = nodes.find((n) => typesOf(n).includes("postaladdress"));
  const types = typesOf(listing);
  const currency = str(offer?.priceCurrency)?.toUpperCase();
  const draft: Partial<ListingDraft> = {
    type: types.includes("house") || types.includes("singlefamilyresidence") ? "house" : undefined,
    title: str(listing.name)?.slice(0, 120),
    description: str(listing.description)?.slice(0, 4000),
    addressLine: str(address?.streetAddress)?.slice(0, 200),
    district: str(address?.addressRegion)?.slice(0, 80),
    city: str(address?.addressLocality)?.slice(0, 80),
    country: str(address?.addressCountry)?.slice(0, 80),
    rentAmount: digits(str(offer?.price), 40),
    currency: currency?.length === 3 ? currency : undefined,
    areaM2: digits(str(listing.floorSize), 40),
    rooms: digits(str(listing.numberOfRooms), 20),
    bedrooms: digits(str(listing.numberOfBedrooms), 4),
    bathrooms: digits(
      str(listing.numberOfBathroomsTotal) ?? str(listing.numberOfFullBathrooms),
      4,
    ),
    yearBuilt: digits(str(listing.yearBuilt), 4),
  };
  return Object.fromEntries(
    Object.entries(draft).filter(([, v]) => v !== undefined),
  ) as Partial<ListingDraft>;
}

function withStructured(
  listing: ListingDraft,
  structured: Partial<ListingDraft>,
): { listing: ListingDraft; missing: string[] } {
  const merged = { ...listing };
  for (const [key, value] of Object.entries(structured) as [keyof ListingDraft, never][]) {
    if (merged[key] === undefined || merged[key] === "") merged[key] = value;
  }
  const parsed = listingDraftSchema.safeParse(merged);
  const final = parsed.success ? parsed.data : listing;
  return {
    listing: final,
    missing: LISTING_KEY_FIELDS.filter((k) => !final[k]),
  };
}

/** Deterministic fallback when no model is configured. */
function mockExtract(signals: PageSignals): { listing: ListingDraft; missing: string[] } {
  const title = (signals.title ?? signals.text.split("\n")[0] ?? "Imported listing")
    .slice(0, 120)
    .padEnd(2, " ");
  const price = signals.text.match(/(\d{1,3}(?:[.,\s]\d{3})+|\d{3,})\s*(TL|TRY|₺|EUR|€|USD|\$|GBP|£)/i);
  const currencyMap: Record<string, string> = {
    tl: "TRY", try: "TRY", "₺": "TRY", eur: "EUR", "€": "EUR", usd: "USD", $: "USD", gbp: "GBP", "£": "GBP",
  };
  const area = signals.text.match(/(\d{2,4})\s*(m²|m2|sqm)/i);
  const structured = jsonLdListing(signals.jsonLd);
  const listing: ListingDraft = {
    type: "apartment",
    features: [],
    ...structured,
    title: structured.title ?? title,
    description:
      structured.description ?? ((signals.description ?? "").slice(0, 4000) || undefined),
    rentAmount: structured.rentAmount ?? price?.[1]?.replace(/[\s.,]/g, ""),
    currency: structured.currency ?? (price ? currencyMap[price[2]!.toLowerCase()] : undefined),
    areaM2: structured.areaM2 ?? area?.[1],
  };
  return withStructured(listing, {});
}

async function extract(signals: PageSignals, sourceUrl: string | null) {
  const model = textModel("sonnet");
  if (!isTextConfigured() || !model) return mockExtract(signals);
  const structured = jsonLdListing(signals.jsonLd);
  const context = [
    sourceUrl ? `Source: ${sourceUrl}` : null,
    signals.title ? `Title: ${signals.title}` : null,
    signals.description ? `Description meta: ${signals.description}` : null,
    signals.jsonLd.length
      ? `JSON-LD:\n${JSON.stringify(signals.jsonLd).slice(0, 8000)}`
      : null,
    `Page text:\n${signals.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    const { object } = await generateObject({
      model,
      schema: extractionSchema,
      system: loadPrompt("listing-import.md"),
      prompt: context,
    });
    return withStructured(object.listing, structured);
  } catch (error) {
    console.error("[listing-import] extraction failed", error);
    return mockExtract(signals);
  }
}

export type ListingImportError =
  | "invalid_url"
  | "fetch_failed"
  | "not_a_listing";

/** Fetches a listing URL (or reads pasted text) and drafts the property fields. */
export async function previewListingImport(input: {
  url?: string;
  text?: string;
}): Promise<{ ok: true; preview: ListingPreview } | { ok: false; error: ListingImportError }> {
  let signals: PageSignals;
  let sourceUrl: string | null = null;

  if (input.url) {
    try {
      const page = await safeFetch(input.url, {
        maxBytes: LISTING_PAGE_MAX_BYTES,
        accept: (type) => type.includes("text/html") || type.includes("application/xhtml"),
      });
      sourceUrl = page.url.toString();
      signals = readPageSignals(page.body.toString("utf8"), page.url);
    } catch (error) {
      if (error instanceof SafeFetchError && error.code === "invalid_url") {
        return { ok: false, error: "invalid_url" };
      }
      return { ok: false, error: "fetch_failed" };
    }
  } else if (input.text && input.text.trim().length > 20) {
    signals = {
      title: null,
      description: null,
      jsonLd: [],
      images: [],
      text: input.text.slice(0, TEXT_LIMIT),
    };
  } else {
    return { ok: false, error: "not_a_listing" };
  }

  if (signals.text.length < 40 && signals.jsonLd.length === 0) {
    return { ok: false, error: "not_a_listing" };
  }

  const { listing, missing } = await extract(signals, sourceUrl);
  return {
    ok: true,
    preview: {
      sourceUrl,
      fields: listing,
      missing,
      imageUrls: signals.images.slice(0, LISTING_IMAGE_LIMIT),
    },
  };
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Downloads one listing photo through the same outbound guards. */
export async function downloadListingImage(url: string) {
  const res = await safeFetch(url, {
    maxBytes: LISTING_IMAGE_MAX_BYTES,
    accept: (type) => Object.keys(IMAGE_TYPES).some((t) => type.startsWith(t)),
  });
  const contentType = Object.keys(IMAGE_TYPES).find((t) => res.contentType.startsWith(t))!;
  return { body: res.body, contentType, extension: IMAGE_TYPES[contentType]! };
}
