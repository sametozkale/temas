/** Client-safe storage constants (the server helpers live in lib/storage.ts). */
export const STORAGE_BUCKETS = {
  media: "property-media",
  documents: "documents",
} as const;
export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
