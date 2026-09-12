import { env, integrations } from "@/lib/env";
import { refreshAccessToken } from "@/lib/integrations/gmail/oauth";
import type { GmailMessage } from "@/lib/integrations/gmail/parse";

export type GmailCredentials = {
  mode?: "dev" | "oauth";
  refreshToken?: string;
  accessToken?: string;
  expiry?: string;
  historyId?: string;
  watchExpiration?: string;
};

async function authedFetch(
  credentials: GmailCredentials,
  path: string,
  init: RequestInit = {},
) {
  const token = await ensureAccessToken(credentials);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gmail_${res.status}:${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function ensureAccessToken(credentials: GmailCredentials) {
  if (credentials.mode === "dev") {
    throw new Error("gmail_dev_mode");
  }
  const expiry = credentials.expiry ? Date.parse(credentials.expiry) : 0;
  if (credentials.accessToken && expiry - 60_000 > Date.now()) {
    return credentials.accessToken;
  }
  if (!credentials.refreshToken) throw new Error("gmail_no_refresh");
  const tokens = await refreshAccessToken(credentials.refreshToken);
  credentials.accessToken = tokens.access_token;
  credentials.expiry = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();
  if (tokens.refresh_token) credentials.refreshToken = tokens.refresh_token;
  return credentials.accessToken;
}

export async function gmailProfile(credentials: GmailCredentials) {
  return authedFetch(credentials, "/profile") as Promise<{
    emailAddress: string;
    historyId: string;
  }>;
}

export async function gmailHistory(
  credentials: GmailCredentials,
  startHistoryId: string,
) {
  const data = (await authedFetch(
    credentials,
    `/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded`,
  )) as {
    history?: {
      messagesAdded?: { message: { id: string; threadId: string } }[];
    }[];
    historyId?: string;
  };
  const ids = new Set<string>();
  for (const h of data.history ?? []) {
    for (const added of h.messagesAdded ?? []) {
      if (added.message?.id) ids.add(added.message.id);
    }
  }
  return { ids: [...ids], historyId: data.historyId ?? startHistoryId };
}

export async function gmailListInbox(credentials: GmailCredentials, max = 20) {
  const data = (await authedFetch(
    credentials,
    `/messages?labelIds=INBOX&maxResults=${max}`,
  )) as { messages?: { id: string }[]; historyId?: string };
  return {
    ids: (data.messages ?? []).map((m) => m.id),
    historyId: data.historyId,
  };
}

export async function gmailGetMessage(
  credentials: GmailCredentials,
  id: string,
) {
  return authedFetch(
    credentials,
    `/messages/${encodeURIComponent(id)}?format=full`,
  ) as Promise<GmailMessage>;
}

export async function gmailSend(
  credentials: GmailCredentials,
  rfc822: string,
  threadId?: string | null,
) {
  const raw = Buffer.from(rfc822)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return authedFetch(credentials, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
  }) as Promise<{ id: string; threadId: string }>;
}

export async function gmailWatch(
  credentials: GmailCredentials,
  topicName: string,
) {
  return authedFetch(credentials, "/watch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicName, labelIds: ["INBOX"] }),
  }) as Promise<{ historyId: string; expiration: string }>;
}

export function gmailTopicConfigured() {
  return integrations.gmailPubsub();
}

export function gmailPubsubTopic() {
  return env().GMAIL_PUBSUB_TOPIC ?? "";
}
