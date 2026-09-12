import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

export type SeedFile = {
  email: string;
  workspaceSlug: string;
  bookingToken: string | null;
  formToken: string | null;
  ownerToken: string | null;
};

export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function readSeed(): SeedFile | null {
  const file = path.join(process.cwd(), "e2e", ".seed.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as SeedFile;
}

type MailpitMessageList = {
  messages: {
    ID: string;
    Subject: string;
    Created: string;
    To: { Address?: string }[];
  }[];
};

export async function waitForMailpitOtp(
  email: string,
  afterMs: number,
  timeoutMs = 20_000,
): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const list = (await fetch(`${MAILPIT_URL}/api/v1/messages`).then((r) => {
      if (!r.ok) throw new Error(`mailpit ${r.status}`);
      return r.json();
    })) as MailpitMessageList;

    const match = list.messages.find((message) => {
      const to = message.To.some(
        (entry) => entry.Address?.toLowerCase() === email.toLowerCase(),
      );
      const recent = Date.parse(message.Created) >= afterMs - 2_000;
      return to && recent && /code|viewing/i.test(message.Subject);
    });

    if (match) {
      const body = (await fetch(
        `${MAILPIT_URL}/api/v1/message/${match.ID}`,
      ).then((r) => r.json())) as { Text?: string; HTML?: string };
      const text = `${body.Text ?? ""}\n${body.HTML ?? ""}`;
      const code = text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Mailpit OTP for ${email} not found`);
}

export async function mailpitAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    return res.ok;
  } catch {
    return false;
  }
}

function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function provisionE2EUser(email: string): Promise<string> {
  const admin = serviceRoleClient();
  if (!admin) {
    throw new Error("Supabase service role is required for e2e users");
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: "E2E Agent" },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "createUser failed");
  }
  return data.user.id;
}

export async function deleteE2EUser(userId: string) {
  const admin = serviceRoleClient();
  if (!admin) return;
  await admin.auth.admin.deleteUser(userId);
}

export async function signInViaMagicLink(
  page: import("@playwright/test").Page,
  email: string,
  next = "/home",
) {
  const admin = serviceRoleClient();
  if (!admin) {
    throw new Error("Supabase service role is required for e2e sign-in");
  }
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashed = data?.properties?.hashed_token;
  const verificationType = data?.properties?.verification_type ?? "magiclink";
  if (error || !hashed) {
    throw new Error(error?.message ?? "generateLink failed");
  }
  await page.goto(
    `/auth/callback?token_hash=${hashed}&type=${verificationType}&next=${encodeURIComponent(next)}`,
  );
  await page.waitForURL(/\/(home|onboarding|properties|calendar)/, {
    timeout: 20_000,
  });
}
