"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { isValidTimezone } from "@/lib/timezones";
import { insertOwnedWorkspace } from "@/lib/workspaces/create";

const schema = z.object({
  fullName: z.string().trim().min(2).max(80),
  workspaceName: z.string().trim().min(2).max(80),
  timezone: z.string().refine(isValidTimezone, "invalid_timezone"),
});

export type OnboardingState = ActionResult;

/**
 * Creates the first workspace for a signed-in user. Runs in system context on
 * purpose: the user has no membership yet, so no RLS policy could admit them.
 */
export async function createWorkspace(
  _prev: OnboardingState | undefined,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requirePersistedUser("/onboarding");

  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    workspaceName: formData.get("workspaceName"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }
  const { fullName, workspaceName, timezone } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(profiles)
        .values({ id: user.id, fullName })
        .onConflictDoUpdate({ target: profiles.id, set: { fullName } });

      await insertOwnedWorkspace(tx, {
        name: workspaceName,
        timezone,
        ownerUserId: user.id,
        ownerName: fullName,
        ownerEmail: user.email,
      });
    });
  } catch (error) {
    const code =
      error && typeof error === "object"
        ? ((error as { code?: string; cause?: { code?: string } }).code ??
          (error as { cause?: { code?: string } }).cause?.code)
        : undefined;
    if (code === "23503") {
      return actionError("session_mismatch");
    }
    return actionError("create_failed");
  }

  redirect("/home");
}
