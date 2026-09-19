import { createHmac, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";

import { env } from "@/lib/env";

const PAIR_TTL_MS = 10 * 60 * 1000;

export type WhatsAppPairPayload = {
  u: string;
  w: string;
  e: number;
};

function pairSecret() {
  return env().SUPABASE_SERVICE_ROLE_KEY || env().DATABASE_URL;
}

function sign(payload: string) {
  return createHmac("sha256", pairSecret()).update(payload).digest("base64url");
}

export function createWhatsAppPairToken(userId: string, workspaceId: string) {
  const body = Buffer.from(
    JSON.stringify({
      u: userId,
      w: workspaceId,
      e: Date.now() + PAIR_TTL_MS,
    } satisfies WhatsAppPairPayload),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyWhatsAppPairToken(
  token: string,
): WhatsAppPairPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as WhatsAppPairPayload;
    if (
      typeof parsed.u !== "string" ||
      typeof parsed.w !== "string" ||
      typeof parsed.e !== "number"
    ) {
      return null;
    }
    if (parsed.e < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function whatsappPairUrl(token: string) {
  return new URL(`/i/wa/${token}`, env().APP_URL).toString();
}

export async function whatsappPairUrlFromRequest(token: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return whatsappPairUrl(token);
  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/i/wa/${encodeURIComponent(token)}`;
}
