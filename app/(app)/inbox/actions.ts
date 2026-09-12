"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getAppContext } from "@/lib/auth";
import { replySchema } from "@/lib/inbox/schema";
import { sendInboxReply } from "@/lib/inbox/send";
import { ForbiddenError, requireAbility } from "@/lib/permissions";

export type InboxState = ActionResult;

export async function sendReply(
  conversationId: string,
  _prev: InboxState | undefined,
  formData: FormData,
): Promise<InboxState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "inbox.write");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  try {
    await sendInboxReply({
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      conversationId,
      body: parsed.data.body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "send_failed";
    if (message === "not_found") return actionError("not_found");
    if (message === "no_recipient") return actionError("no_recipient");
    return actionError("send_failed");
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/", "layout");
  return actionOk();
}
