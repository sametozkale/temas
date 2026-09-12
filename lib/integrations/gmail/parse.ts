export type GmailPayloadPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPayloadPart[];
  headers?: { name: string; value: string }[];
};

export type GmailMessage = {
  id: string;
  threadId: string;
  historyId?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPayloadPart;
};

function header(payload: GmailPayloadPart | undefined, name: string) {
  const found = payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return found?.value ?? "";
}

function decodeBase64Url(data: string) {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function collectBodies(
  part: GmailPayloadPart | undefined,
  acc: { text: string; html: string },
) {
  if (!part) return acc;
  if (part.mimeType === "text/plain" && part.body?.data) {
    acc.text += decodeBase64Url(part.body.data);
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    acc.html += decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) collectBodies(child, acc);
  return acc;
}

export function parseGmailMessage(message: GmailMessage) {
  const payload = message.payload;
  const bodies = collectBodies(payload, { text: "", html: "" });
  const sentAt = message.internalDate
    ? new Date(Number(message.internalDate))
    : new Date();
  return {
    externalId: message.id,
    threadId: message.threadId,
    from: header(payload, "From"),
    to: header(payload, "To"),
    subject: header(payload, "Subject"),
    messageId: header(payload, "Message-ID") || header(payload, "Message-Id"),
    inReplyTo: header(payload, "In-Reply-To"),
    body: bodies.text.trim() || stripHtml(bodies.html),
    bodyHtml: bodies.html.trim() || null,
    sentAt,
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
