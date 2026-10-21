import type { AbstractIntlMessages } from "next-intl";

type MessageTree = { [key: string]: unknown };

function isTree(value: unknown): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Copy the branches client components actually call `useTranslations` for.
 * Server Components read the full catalog via `getTranslations` and do not
 * need these strings in the RSC payload.
 */
export function pickMessages(
  source: object,
  paths: readonly string[],
): AbstractIntlMessages {
  const result: MessageTree = {};
  for (const path of paths) {
    const parts = path.split(".").filter(Boolean);
    if (parts.length === 0) continue;
    let cursor: unknown = source as MessageTree;
    for (const part of parts) {
      if (!isTree(cursor) || !(part in cursor)) {
        cursor = undefined;
        break;
      }
      cursor = cursor[part];
    }
    if (cursor === undefined) continue;
    let target = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!;
      const next = target[key];
      if (!isTree(next)) target[key] = {};
      target = target[key] as MessageTree;
    }
    target[parts[parts.length - 1]!] = cursor;
  }
  return result as AbstractIntlMessages;
}

/** Drop top-level namespaces that no client component on this route reads. */
export function omitMessages(
  source: object,
  keys: readonly string[],
): AbstractIntlMessages {
  const next: MessageTree = {};
  for (const [key, value] of Object.entries(source)) {
    if (keys.includes(key)) continue;
    next[key] = value;
  }
  return next as AbstractIntlMessages;
}

/** Client strings for the public marketing pages (home, pricing, product, legal). */
export const MARKETING_CLIENT_PATHS = [
  "errors",
  "marketing.mock",
  "marketing.plans",
] as const;

/** Sign-in, sign-up, and invite acceptance. */
export const AUTH_CLIENT_PATHS = [
  "errors",
  "auth",
  "invite",
  "common",
] as const;

/** First-run workspace form. */
export const ONBOARDING_CLIENT_PATHS = [
  "errors",
  "onboarding",
  "common",
] as const;

/**
 * Token pages opened from WhatsApp and email: booking, forms, owner review,
 * tenant availability. `settings.integrations` is server-rendered on the
 * pairing page and stays out of the client payload.
 */
export const PUBLIC_CLIENT_PATHS = [
  "errors",
  "common",
  "booking",
  "public_form",
  "owner_view",
  "tenant",
  // Tenant availability grid (`WeekGrid`) reads weekday names.
  "viewings",
] as const;

/** Workspace app: everything except the marketing catalog. */
export const APP_OMIT_NAMESPACES = ["marketing"] as const;
