import "server-only";

import { randomUUID } from "node:crypto";

import {
  DOCUMENT_MAX_BYTES,
  STORAGE_BUCKETS,
  type StorageBucket,
} from "@/lib/storage-constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Storage access (docs/02 stack, drizzle/0006 + 0019).
 *
 * `property-media` and `documents` are private: objects live under
 * "<workspaceId>/<propertyId>/<uuid>.<ext>" and storage RLS grants access to
 * workspace members only. `avatars` is a public bucket
 * (`profiles/{userId}/…`, `workspaces/{workspaceId}/…`). Every call here
 * runs with the *user's* session client — never the service role. Server
 * Actions still call `requireAbility()` before issuing any URL.
 */
export {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  DOCUMENT_MAX_BYTES,
  MEDIA_MAX_BYTES,
  MEDIA_MIME_TYPES,
  STORAGE_BUCKETS,
  mediaTypeOf,
  type MediaMimeType,
  type StorageBucket,
} from "./storage-constants";
export {
  buildProfileAvatarPath,
  buildWorkspaceLogoPath,
  isProfileAvatarPath,
  isWorkspaceLogoPath,
} from "./storage-paths";

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
  if (error || !data?.path || !data.token) {
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
  if (error) {
    console.error("[storage] signed downloads failed", error.message);
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
    else if (item.error) {
      console.error("[storage] signed url failed", item.path, item.error);
    }
  }
  return map;
}

export async function uploadBuffer(
  bucket: StorageBucket,
  path: string,
  body: Buffer,
  contentType: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
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

/**
 * Public form uploads have no user session. Uses the service role when
 * configured; returns null so the submission can still store the filename.
 */
export async function uploadPublicDocument(path: string, file: File) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  if (file.size > DOCUMENT_MAX_BYTES) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from(STORAGE_BUCKETS.documents)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    console.error("[storage] public upload failed", error.message);
    return null;
  }
  return path;
}
