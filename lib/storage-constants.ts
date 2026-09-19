/** Client-safe storage constants (the server helpers live in lib/storage.ts). */
export const STORAGE_BUCKETS = {
  media: "property-media",
  documents: "documents",
  avatars: "avatars",
} as const;
export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;
export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

const MEDIA_EXT: Record<string, MediaMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

/** Map a browser `File.type` (or filename) onto a storage-allowed photo MIME. */
export function mediaTypeOf(type: string, fileName = ""): MediaMimeType | null {
  const raw = type.trim().toLowerCase();
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if ((MEDIA_MIME_TYPES as readonly string[]).includes(raw)) {
    return raw as MediaMimeType;
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_EXT[ext] ?? null;
}
export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

/** Public bucket URL for a stored object path (or a legacy absolute URL). */
export function publicObjectUrl(
  bucket: StorageBucket,
  path: string | null | undefined,
  baseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.includes("..") || path.includes("\\") || !baseUrl) return null;
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${encoded}`;
}

export function avatarPublicUrl(path: string | null | undefined) {
  return publicObjectUrl(STORAGE_BUCKETS.avatars, path);
}
