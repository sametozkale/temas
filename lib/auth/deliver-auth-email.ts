import "server-only";

import { AuthCodeEmail, AuthLinkEmail } from "@/emails/auth-link";
import {
  AUTH_EMAIL_COPY,
  authEmailHref,
  type AuthEmailActionType,
  type SendEmailHookPayload,
} from "@/lib/auth/send-email-hook";
import { sendEmail } from "@/lib/integrations/resend";

export async function deliverAuthEmail(
  payload: SendEmailHookPayload,
): Promise<void> {
  const email = payload.user.email?.trim();
  if (!email) throw new Error("missing_email");

  const action = (payload.email_data.email_action_type ??
    "magiclink") as AuthEmailActionType;

  if (action === "reauthentication") {
    const code = payload.email_data.token ?? "";
    if (!code) throw new Error("missing_token");
    await sendEmail({
      to: email,
      subject: `${code} is your Temas verification code`,
      react: AuthCodeEmail({
        preview: `${code} is your Temas verification code`,
        heading: "Your verification code",
        lede: "Use this code to continue. It expires in a few minutes.",
        code,
      }),
    });
    return;
  }

  const copy = AUTH_EMAIL_COPY[action] ?? AUTH_EMAIL_COPY.magiclink;
  const tokenHash = payload.email_data.token_hash;
  if (!tokenHash) throw new Error("missing_token_hash");

  const href = authEmailHref({
    tokenHash,
    type: action === "email_change_new" ? "email_change" : action,
    redirectTo: payload.email_data.redirect_to,
  });

  const lede =
    action === "magiclink"
      ? `We sent this one-time link to ${email}. It is valid for 1 hour.`
      : copy.lede;

  await sendEmail({
    to: email,
    subject: copy.subject,
    react: AuthLinkEmail({
      preview: copy.preview,
      heading: copy.heading,
      lede,
      href,
      cta: copy.cta,
    }),
  });
}
