import "server-only";

import { randomUUID } from "node:crypto";

import { type StorageBucket } from "@/lib/storage-constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Storage access (docs/02 stack, drizzle/0006).
 *
 * Buckets are private. Objects live under "<workspaceId>/<propertyId>/<uuid>.<ext>"
 * and storage RLS grants access to workspace members only, so every call here
 * runs with the *user's* session client — never the service role. Server
 * Actions still call `requireAbility()` before issuing any URL.
 */
export {
  DOCUMENT_MAX_BYTES,
  MEDIA_MAX_BYTES,
  MEDIA_MIME_TYPES,
  STORAGE_BUCKETS,
  type StorageBucket,
} from "./storage-constants";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function safeExtension(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
}

export function buildObjectPath(
  workspaceId: string,
  propertyId: string,
  fileName: string,
) {
  return `${workspaceId}/${propertyId}/${randomUUID()}.${safeExtension(fileName)}`;
}

/** True when `path` sits under the given workspace/property folder. */
export function isPathWithin(
  path: string,
  workspaceId: string,
  propertyId: string,
) {
  return (
    path.startsWith(`${workspaceId}/${propertyId}/`) && !path.includes("..")
  );
}

/** One-shot upload token; the browser PUTs the file with `uploadToSignedUrl`. */
export async function createSignedUpload(bucket: StorageBucket, path: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create upload URL");
  }
  return { path: data.path, token: data.token };
}

export async function createSignedDownload(
  bucket: StorageBucket,
  path: string,
  options: { download?: string | boolean } = {},
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      download: options.download,
    });
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create download URL");
  }
  return data.signedUrl;
}

/** Batch signed URLs for rendering galleries; returns a path → url map. */
export async function createSignedDownloads(
  bucket: StorageBucket,
  paths: string[],
) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return map;
  for (const item of data) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

export async function removeObjects(bucket: StorageBucket, paths: string[]) {
  if (paths.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    // Orphaned objects are not fatal; the DB row is the source of truth.
    console.error("[storage] remove failed", error.message);
  }
}
