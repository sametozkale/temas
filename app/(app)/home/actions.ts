"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getAppContext } from "@/lib/auth";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { dismissReminder, scanWorkspaceReminders } from "@/lib/reminders/scan";

export async function scanNow(): Promise<ActionResult> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "ai.use");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
  await scanWorkspaceReminders(ctx.workspace.id);
  revalidatePath("/home");
  return actionOk();
}

export async function dismissReminderAction(
  reminderId: string,
): Promise<ActionResult> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "ai.use");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
  await dismissReminder(ctx.workspace.id, reminderId);
  revalidatePath("/home");
  return actionOk();
}
