import { createHash } from "node:crypto";

/**
 * Public portrait for an email address, when one exists.
 * Gravatar returns 404 for an address with no photo; the avatar falls back to initials.
 */
export function portraitFromEmail(
  email: string | null | undefined,
): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=128&d=404`;
}
