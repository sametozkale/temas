"use server";

import { z } from "zod";

import {
  actionError,
  actionOk,
  safeNextPath,
  type ActionResult,
} from "@/lib/action-result";
import { deliverAuthEmail } from "@/lib/auth/deliver-auth-email";
import { recentAuthEmailCooldown } from "@/lib/auth/email-cooldown";
import { publicAppUrl } from "@/lib/app-url";
import { clientIp } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  next: z.string().optional(),
});

export type MagicLinkState = ActionResult<{ email: string }>;

export async function sendMagicLink(
  _prev: MagicLinkState | undefined,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return actionError("invalid_email");
  }

  const next = safeNextPath(parsed.data.next);
  const ip = await clientIp();
  const emailLimit = await consumeRateLimit(
    `login:email:${parsed.data.email}`,
    5,
    15 * 60 * 1000,
  );
  const ipLimit = await consumeRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!emailLimit.ok || !ipLimit.ok) {
    return actionError("rate_limited");
  }

  const redirectTo = new URL("/auth/callback", await publicAppUrl());
  redirectTo.searchParams.set("next", next);

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: parsed.data.email,
      options: { redirectTo: redirectTo.toString() },
    });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      if (error && recentAuthEmailCooldown(error)) {
        return actionOk({ email: parsed.data.email });
      }
      return actionError(error?.status === 429 ? "rate_limited" : "send_failed");
    }
    try {
      await deliverAuthEmail({
        user: { email: parsed.data.email },
        email_data: {
          token_hash: tokenHash,
          email_action_type: "magiclink",
          redirect_to: redirectTo.toString(),
        },
      });
    } catch {
      return actionError("send_failed");
    }
    return actionOk({ email: parsed.data.email });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (recentAuthEmailCooldown(error)) {
      return actionOk({ email: parsed.data.email });
    }
    return actionError(error.status === 429 ? "rate_limited" : "send_failed");
  }
  return actionOk({ email: parsed.data.email });
}
