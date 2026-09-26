"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { PrioritySupportEmail } from "@/emails/priority-support";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { sendEmail } from "@/lib/integrations/resend";
import { requireAbility } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  SUPPORT_EMAIL,
  parseSupportPlan,
  priorityNoteSchema,
  supportPlanSchema,
} from "@/lib/support";

export type SupportState = ActionResult;

export async function selectSupportPlan(plan: string): Promise<SupportState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.read");

  const parsed = supportPlanSchema.safeParse({ plan });
  if (!parsed.success) return actionError("invalid");

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(profiles)
      .set({ supportPlan: parsed.data.plan })
      .where(eq(profiles.id, ctx.user.id));
  });

  revalidatePath("/settings/support");
  return actionOk();
}

export async function sendPriorityNote(
  _prev: SupportState | undefined,
  formData: FormData,
): Promise<SupportState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.read");

  const parsed = priorityNoteSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const [row] = await withUserContext(ctx.user.id, (tx) =>
    tx
      .select({ supportPlan: profiles.supportPlan })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1),
  );
  if (parseSupportPlan(row?.supportPlan) !== "priority") {
    return actionError("not_entitled");
  }

  const limit = await consumeRateLimit(
    `priority-support:${ctx.user.id}`,
    8,
    60 * 60_000,
  );
  if (!limit.ok) return actionError("rate_limited");

  const authorEmail = ctx.user.email?.trim();
  if (!authorEmail) return actionError("send_failed");

  const authorName = ctx.profile.fullName?.trim() || authorEmail;

  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      replyTo: authorEmail,
      subject: `Priority support from ${authorName}: ${parsed.data.subject}`,
      react: PrioritySupportEmail({
        authorName,
        authorEmail,
        userId: ctx.user.id,
        workspaceName: ctx.workspace.name,
        subject: parsed.data.subject,
        body: parsed.data.body,
      }),
    });
  } catch {
    return actionError("send_failed");
  }

  return actionOk();
}
