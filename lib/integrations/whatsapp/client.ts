import "server-only";

import { env, integrations } from "@/lib/env";

const GRAPH = "https://graph.facebook.com/v21.0";

export type WhatsAppSendResult = {
  externalId: string | null;
  mode: "cloud" | "dev";
};

export async function sendWhatsAppText(input: {
  to: string;
  body: string;
}): Promise<WhatsAppSendResult> {
  if (!integrations.whatsapp()) {
    return { externalId: `dev:wa:${crypto.randomUUID()}`, mode: "dev" };
  }
  const payload = {
    messaging_product: "whatsapp",
    to: input.to.replace(/\D/g, ""),
    type: "text",
    text: { body: input.body },
  };
  const json = await graphPost(payload);
  return { externalId: json.messages?.[0]?.id ?? null, mode: "cloud" };
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  language?: string;
  components?: unknown[];
}): Promise<WhatsAppSendResult> {
  if (!integrations.whatsapp()) {
    return { externalId: `dev:wa:${crypto.randomUUID()}`, mode: "dev" };
  }
  const payload = {
    messaging_product: "whatsapp",
    to: input.to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.language ?? "en_US" },
      components: input.components,
    },
  };
  const json = await graphPost(payload);
  return { externalId: json.messages?.[0]?.id ?? null, mode: "cloud" };
}

async function graphPost(payload: unknown) {
  const phoneNumberId = env().META_WHATSAPP_PHONE_NUMBER_ID;
  const token = env().META_WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("whatsapp_not_configured");
  }
  const response = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(json.error?.message ?? "whatsapp_send_failed");
  }
  return json;
}
