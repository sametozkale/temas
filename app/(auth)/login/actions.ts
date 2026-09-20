"use server";

import { z } from "zod";

import {
  actionError,
  actionOk,
  safeNextPath,
  type ActionResult,
} from "@/lib/action-result";
import { publicAppUrl } from "@/lib/app-url";
import { clientIp } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return actionError(error.status === 429 ? "rate_limited" : "send_failed");
  }
  return actionOk({ email: parsed.data.email });
}
