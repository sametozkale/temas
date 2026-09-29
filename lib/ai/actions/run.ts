import type { FileUIPart } from "ai";

import type { ActionResult } from "@/lib/action-result";
import { withActivityOrigin } from "@/lib/activity";
import type { AppContext } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";

/** What every Ask write tool returns; the chat renders it as an action card. */
export type ActionOutcome =
  | {
      ok: true;
      /** One English line for the model to relay. */
      summary: string;
      /** Record the card links to. */
      href?: string;
      hrefLabel?: string;
      /** Field-level diff for update cards. */
      changes?: { field: string; before: string | null; after: string | null }[];
      /** Shareable link produced by the action (invite, owner view). */
      url?: string;
      data?: Record<string, unknown>;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const WRITE_LIMIT_PER_TURN = 5;

export type ActionScope = {
  ctx: AppContext;
  threadId: string;
  /** Files attached on this conversation's user turns (live only). */
  files: FileUIPart[];
  writes: { count: number };
  /** Metered tool runs this request, added to the assistant row's credits. */
  charges: { listingImport: number };
};

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionOutcome {
  return { ok: false, error, fieldErrors };
}

export function fromResult(
  result: ActionResult<unknown>,
  ok: Omit<Extract<ActionOutcome, { ok: true }>, "ok">,
): ActionOutcome {
  if (!result.ok) return fail(result.error, result.fieldErrors);
  return { ok: true, ...ok };
}

/**
 * Runs one write: enforces the per-turn cap, tags audit rows with
 * `via: "ask"`, and turns permission errors into a card instead of a crash.
 * The product function it calls still does zod + requireAbility itself.
 */
export async function write(
  scope: ActionScope,
  fn: () => Promise<ActionOutcome>,
): Promise<ActionOutcome> {
  if (scope.writes.count >= WRITE_LIMIT_PER_TURN) return fail("limit_reached");
  scope.writes.count += 1;
  try {
    return await withActivityOrigin(
      { via: "ask", threadId: scope.threadId },
      fn,
    );
  } catch (error) {
    if (error instanceof ForbiddenError) return fail("forbidden");
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return fail("failed");
    }
    console.error("[ask action] failed", error);
    return fail("failed");
  }
}

/** Builds a FormData for actions that still take a form post. */
export function formOf(values: Record<string, string | null | undefined>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) form.set(key, value);
  }
  return form;
}
