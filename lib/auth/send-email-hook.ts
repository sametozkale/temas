import { createHmac, timingSafeEqual } from "node:crypto";

import { appPath, publicOriginFromRedirect } from "@/lib/app-url";

export type AuthEmailActionType =
  | "magiclink"
  | "signup"
  | "invite"
  | "recovery"
  | "email_change"
  | "email_change_new"
  | "reauthentication";

export type SendEmailHookPayload = {
  user: { email?: string };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
};

export const AUTH_EMAIL_COPY: Record<
  Exclude<AuthEmailActionType, "reauthentication">,
  {
    subject: string;
    preview: string;
    heading: string;
    lede: string;
    cta: string;
  }
> = {
  magiclink: {
    subject: "Your Temas sign-in link",
    preview: "Your one-time Temas sign-in link. It expires in 1 hour.",
    heading: "Sign in to Temas",
    lede: "This one-time sign-in link is valid for 1 hour.",
    cta: "Sign in",
  },
  signup: {
    subject: "Confirm your email for Temas",
    preview: "Confirm this email address to finish signing in to Temas.",
    heading: "Confirm your email",
    lede: "Confirm this address to finish signing in. The link expires in 1 hour.",
    cta: "Confirm email",
  },
  invite: {
    subject: "You're invited to Temas",
    preview: "Accept this invitation to join a Temas workspace.",
    heading: "You're invited to Temas",
    lede: "This address was invited to a Temas workspace. Accept to create your account. The link expires in 1 hour.",
    cta: "Accept invitation",
  },
  recovery: {
    subject: "Reset your Temas password",
    preview: "Use this link to choose a new password. It expires in 1 hour.",
    heading: "Reset your password",
    lede: "Use the button below to choose a new password. This link expires in 1 hour.",
    cta: "Reset password",
  },
  email_change: {
    subject: "Confirm your new email for Temas",
    preview:
      "Confirm this address to finish changing the email on your Temas account.",
    heading: "Confirm your new email",
    lede: "Confirm this address to finish changing the email on your Temas account. The link expires in 1 hour.",
    cta: "Confirm email",
  },
  email_change_new: {
    subject: "Confirm your new email for Temas",
    preview:
      "Confirm this address to finish changing the email on your Temas account.",
    heading: "Confirm your new email",
    lede: "Confirm this address to finish changing the email on your Temas account. The link expires in 1 hour.",
    cta: "Confirm email",
  },
};

function parseHookSecret(raw: string) {
  return raw.replace(/^v1,/, "").replace(/^whsec_/, "");
}

export function verifySendEmailHookSignature(input: {
  secret: string;
  payload: string;
  id: string;
  timestamp: string;
  signatureHeader: string;
}) {
  const ageSec = Math.abs(Date.now() / 1000 - Number(input.timestamp));
  if (!Number.isFinite(ageSec) || ageSec > 5 * 60) return false;

  const key = Buffer.from(parseHookSecret(input.secret), "base64");
  const signed = `${input.id}.${input.timestamp}.${input.payload}`;
  const digest = createHmac("sha256", key).update(signed).digest("base64");
  const expected = `v1,${digest}`;
  return input.signatureHeader.split(/\s+/).some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export function authEmailHref(input: {
  tokenHash: string;
  type: string;
  redirectTo?: string;
}) {
  const origin = publicOriginFromRedirect(input.redirectTo);
  const url = new URL(appPath("/auth/callback", origin));
  url.searchParams.set("token_hash", input.tokenHash);
  url.searchParams.set("type", input.type);
  return url.toString();
}
