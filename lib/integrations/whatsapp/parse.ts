import { createHmac, timingSafeEqual } from "node:crypto";

export type WhatsAppInbound = {
  phoneNumberId: string | null;
  from: string;
  profileName: string | null;
  body: string;
  externalId: string;
  sentAt: Date;
};

type WhatsAppPayload = {
  object?: string;
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: {
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
};

export function parseWhatsAppPayload(payload: unknown): WhatsAppInbound[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as WhatsAppPayload;
  const out: WhatsAppInbound[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const phoneNumberId = value.metadata?.phone_number_id ?? null;
      const names = new Map(
        (value.contacts ?? []).map((c) => [
          c.wa_id ?? "",
          c.profile?.name ?? null,
        ]),
      );
      for (const message of value.messages ?? []) {
        if (!message.from || !message.id) continue;
        const text = message.text?.body?.trim();
        if (!text) continue;
        const sentAt = message.timestamp
          ? new Date(Number(message.timestamp) * 1000)
          : new Date();
        out.push({
          phoneNumberId,
          from: message.from,
          profileName: names.get(message.from) ?? null,
          body: text,
          externalId: message.id,
          sentAt: Number.isNaN(sentAt.getTime()) ? new Date() : sentAt,
        });
      }
    }
  }
  return out;
}

export function verifyWhatsAppSignature(
  rawBody: string,
  header: string | null,
  appSecret: string | undefined,
) {
  if (!appSecret) return true;
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const given = header.slice("sha256=".length);
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function digitsPhone(phone: string) {
  return phone.replace(/\D/g, "");
}
