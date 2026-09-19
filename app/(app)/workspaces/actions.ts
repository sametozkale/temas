"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, type ActionResult } from "@/lib/action-result";
import { requireUser, writeWorkspaceCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { insertOwnedWorkspace } from "@/lib/workspaces/create";
import { isValidTimezone } from "@/lib/timezones";

export type CreateWorkspaceState = ActionResult;

const schema = z.object({
  workspaceName: z.string().trim().min(2).max(80),
  timezone: z.string().refine(isValidTimezone, "invalid_timezone"),
});

export async function createAdditionalWorkspace(
  _prev: CreateWorkspaceState | undefined,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    workspaceName: formData.get("workspaceName"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const [profile] = await db
    .select({ fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const ownerName = profile?.fullName || user.email || "Owner";

  const workspaceId = await db.transaction(async (tx) =>
    insertOwnedWorkspace(tx, {
      name: parsed.data.workspaceName,
      timezone: parsed.data.timezone,
      ownerUserId: user.id,
      ownerName,
      ownerEmail: user.email,
    }),
  );

  const cookieStore = await cookies();
  writeWorkspaceCookie(cookieStore, workspaceId);
  redirect("/home");
}
