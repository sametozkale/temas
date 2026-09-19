"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { removeThread, updateThreadTitle } from "@/lib/ai/ask";
import { renameThreadSchema } from "@/lib/ai/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { uuidSchema } from "@/lib/properties/schema";
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

function gateAi(ctx: Awaited<ReturnType<typeof getAppContext>>) {
  try {
    requireAbility(ctx.membership, "ai.use");
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
}

export async function renameThread(
  threadId: string,
  title: string,
): Promise<ActionResult<{ title: string }>> {
  const ctx = await getAppContext();
  const denied = gateAi(ctx);
  if (denied) return denied;

  const parsed = renameThreadSchema.safeParse({ threadId, title });
  if (!parsed.success) return actionError("invalid");

  const row = await withUserContext(ctx.user.id, (tx) =>
    updateThreadTitle(
      tx,
      ctx.workspace.id,
      ctx.user.id,
      parsed.data.threadId,
      parsed.data.title,
    ),
  );
  if (!row?.title) return actionError("not_found");
  revalidatePath("/", "layout");
  return actionOk({ title: row.title });
}

export async function deleteThread(threadId: string): Promise<ActionResult> {
  const ctx = await getAppContext();
  const denied = gateAi(ctx);
  if (denied) return denied;

  const parsed = uuidSchema.safeParse(threadId);
  if (!parsed.success) return actionError("invalid");

  const removed = await withUserContext(ctx.user.id, (tx) =>
    removeThread(tx, ctx.workspace.id, ctx.user.id, parsed.data),
  );
  if (!removed) return actionError("not_found");
  revalidatePath("/", "layout");
  redirect("/home");
}
