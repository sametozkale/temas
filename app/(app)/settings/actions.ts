"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { profiles, workspaces } from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";
import { isValidTimezone } from "@/lib/timezones";

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z.string().refine(isValidTimezone, "invalid_timezone"),
});

export type SettingsState = ActionResult;

export async function updateWorkspace(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.update");

  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(workspaces)
      .set({ name: parsed.data.name, timezone: parsed.data.timezone })
      .where(eq(workspaces.id, ctx.workspace.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "workspace.updated",
        entity: "workspace",
        entityId: ctx.workspace.id,
        data: parsed.data,
      },
      tx,
    );
  });

  revalidatePath("/", "layout");
  return actionOk();
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getAppContext();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(profiles)
      .set({ fullName: parsed.data.fullName, phone: parsed.data.phone || null })
      .where(eq(profiles.id, ctx.user.id));
  });

  revalidatePath("/", "layout");
  return actionOk();
}
