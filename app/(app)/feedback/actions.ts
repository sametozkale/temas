"use server";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getAppContext } from "@/lib/auth";
import { FeedbackEmail } from "@/emails/feedback";
import { feedbackInbox } from "@/lib/feedback/inbox";
import { feedbackSchema } from "@/lib/feedback/schema";
import { sendEmail } from "@/lib/integrations/resend";
import { consumeRateLimit } from "@/lib/rate-limit";

export type FeedbackState = ActionResult;

function safeFeedbackPath(path: string | undefined): string | undefined {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return undefined;
  return path.slice(0, 200);
}

export async function sendFeedback(
  _prev: FeedbackState | undefined,
  formData: FormData,
): Promise<FeedbackState> {
  const ctx = await getAppContext();
  const parsed = feedbackSchema.safeParse({
    body: formData.get("body"),
    path: formData.get("path") || undefined,
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const limit = await consumeRateLimit(
    `feedback:${ctx.user.id}`,
    8,
    60 * 60_000,
  );
  if (!limit.ok) return actionError("rate_limited");

  const to = feedbackInbox();
  if (!to) return actionError("not_configured");

  const authorEmail = ctx.user.email?.trim();
  if (!authorEmail) return actionError("send_failed");

  try {
    await sendEmail({
      to,
      replyTo: authorEmail,
      subject: `Temas feedback from ${ctx.profile.fullName?.trim() || authorEmail}`,
      react: FeedbackEmail({
        authorName: ctx.profile.fullName?.trim() || authorEmail,
        authorEmail,
        workspaceName: ctx.workspace.name,
        path: safeFeedbackPath(parsed.data.path),
        body: parsed.data.body,
      }),
    });
  } catch {
    return actionError("send_failed");
  }

  return actionOk();
}
