import { randomUUID } from "node:crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeExtension(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
}

function isSafeObjectName(path: string, prefix: string, ownerId: string) {
  if (path.includes("..") || path.includes("\\")) return false;
  const [folder, owner, file, extra] = path.split("/");
  return (
    extra === undefined &&
    folder === prefix &&
    owner === ownerId &&
    UUID_RE.test(ownerId) &&
    typeof file === "string" &&
    file.length > 0
  );
}

export function buildProfileAvatarPath(userId: string, fileName: string) {
  return `profiles/${userId}/${randomUUID()}.${safeExtension(fileName)}`;
}

export function buildWorkspaceLogoPath(workspaceId: string, fileName: string) {
  return `workspaces/${workspaceId}/${randomUUID()}.${safeExtension(fileName)}`;
}

export function isProfileAvatarPath(path: string, userId: string) {
  return isSafeObjectName(path, "profiles", userId);
}

export function isWorkspaceLogoPath(path: string, workspaceId: string) {
  return isSafeObjectName(path, "workspaces", workspaceId);
}
