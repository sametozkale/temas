"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { generateDraft } from "@/lib/ai/drafts";
import { TONES } from "@/lib/ai/types";
import { getAppContext } from "@/lib/auth";
import { applyMailboxAction, MAILBOX_ACTIONS } from "@/lib/inbox/mailbox";
import { replySchema } from "@/lib/inbox/schema";
import { sendInboxReply } from "@/lib/inbox/send";
import { loadOlderGmail } from "@/lib/integrations/gmail/sync";
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

  const draftRaw = formData.get("draftId");
  const draftId =
    typeof draftRaw === "string" && draftRaw.length > 0 ? draftRaw : null;

  try {
    await sendInboxReply({
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      conversationId,
      body: parsed.data.body,
      draftId,
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

export async function manageMailbox(
  conversationId: string,
  action: string,
): Promise<InboxState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "inbox.write");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = MAILBOX_ACTIONS.find((value) => value === action);
  if (!parsed) return actionError("invalid");

  try {
    await applyMailboxAction({
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      conversationId,
      action: parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "mailbox_failed";
    if (message === "not_found" || message === "not_email") {
      return actionError("not_found");
    }
    if (message.startsWith("gmail_403")) return actionError("reconnect");
    return actionError("mailbox_failed");
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/", "layout");
  return actionOk();
}

export async function loadOlderMail(): Promise<
  ActionResult<{ more: boolean }>
> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "inbox.read");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  try {
    const result = await loadOlderGmail(ctx.user.id);
    revalidatePath("/inbox");
    revalidatePath("/", "layout");
    return actionOk(result);
  } catch {
    return actionError("load_older");
  }
}

export async function draftReply(
  conversationId: string,
  tone: string,
): Promise<ActionResult<{ id: string; body: string }>> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "ai.use");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsedTone = TONES.find((value) => value === tone);
  if (!parsedTone) return actionError("invalid");

  try {
    const draft = await generateDraft({
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      conversationId,
      tone: parsedTone,
    });
    return actionOk(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "draft_failed";
    if (message === "not_found") return actionError("not_found");
    return actionError("draft_failed");
  }
}
