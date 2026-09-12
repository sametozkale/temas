/** Uniform Server Action return shape consumed by `useActionState`. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const actionOk = <T>(data?: T): ActionResult<T> => ({ ok: true, data });
export const actionError = <T = undefined>(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> => ({ ok: false, error, fieldErrors });

/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/home",
) {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
