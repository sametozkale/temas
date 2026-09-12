"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  contacts,
  profiles,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { randomSuffix, slugify } from "@/lib/slug";
import { isValidTimezone } from "@/lib/timezones";

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
  const user = await requireUser("/onboarding");

  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    workspaceName: formData.get("workspaceName"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }
  const { fullName, workspaceName, timezone } = parsed.data;

  const workspaceId = await db.transaction(async (tx) => {
    const base = slugify(workspaceName) || "workspace";
    const [ws] = await tx
      .insert(workspaces)
      .values({
        name: workspaceName,
        slug: `${base}-${randomSuffix()}`,
        timezone,
      })
      .returning({ id: workspaces.id });
    if (!ws) throw new Error("workspace_insert_failed");

    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: ws.id, userId: user.id, role: "owner" });

    await tx
      .insert(profiles)
      .values({ id: user.id, fullName })
      .onConflictDoUpdate({ target: profiles.id, set: { fullName } });

    // The agent is also a contact in their own workspace (viewing participant).
    if (user.email) {
      await tx
        .insert(contacts)
        .values({
          workspaceId: ws.id,
          userId: user.id,
          fullName,
          email: user.email,
          emailVerified: true,
        })
        .onConflictDoNothing();
    }

    await logActivity(
      {
        workspaceId: ws.id,
        actorId: user.id,
        action: "workspace.created",
        entity: "workspace",
        entityId: ws.id,
        data: { name: workspaceName },
      },
      tx,
    );

    return ws.id;
  });

  void workspaceId;
  redirect("/home");
}
