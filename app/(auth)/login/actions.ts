"use server";

import { z } from "zod";

import {
  actionError,
  actionOk,
  safeNextPath,
  type ActionResult,
} from "@/lib/action-result";
import { env } from "@/lib/env";
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
  const redirectTo = new URL("/auth/callback", env().APP_URL);
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
