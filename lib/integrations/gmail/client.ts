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
  /** Set after the first INBOX import so later syncs only pull the delta. */
  bootstrapped?: boolean;
  /**
   * Gmail `nextPageToken` for older INBOX pages. Missing means page 2 has
   * not been requested. `""` means the mailbox has no older page.
   */
  inboxPageToken?: string;
  /** Space-separated scopes granted on the last consent. */
  scope?: string;
  /** Google calendars the user chose to show. Missing means primary only. */
  selectedCalendarIds?: string[];
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
  if (tokens.scope) credentials.scope = tokens.scope;
  return credentials.accessToken;
}

export async function gmailProfile(credentials: GmailCredentials) {
  return authedFetch(credentials, "/profile") as Promise<{
    emailAddress: string;
    historyId: string;
  }>;
}

export function gmailThreadStarred(messages: { labelIds?: string[] }[]) {
  return messages.some((message) => message.labelIds?.includes("STARRED"));
}

export async function gmailHistory(
  credentials: GmailCredentials,
  startHistoryId: string,
) {
  const query = new URLSearchParams({ startHistoryId });
  query.append("historyTypes", "messageAdded");
  query.append("historyTypes", "labelAdded");
  query.append("historyTypes", "labelRemoved");
  const data = (await authedFetch(
    credentials,
    `/history?${query.toString()}`,
  )) as {
    history?: {
      messagesAdded?: { message: { id: string; threadId: string } }[];
      labelsAdded?: {
        message: { id: string; threadId: string };
        labelIds?: string[];
      }[];
      labelsRemoved?: {
        message: { id: string; threadId: string };
        labelIds?: string[];
      }[];
    }[];
    historyId?: string;
  };
  const ids = new Set<string>();
  const threadIds = new Set<string>();
  const starThreadIds = new Set<string>();
  for (const entry of data.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      if (added.message?.id) ids.add(added.message.id);
      if (added.message?.threadId) threadIds.add(added.message.threadId);
    }
    for (const change of [
      ...(entry.labelsAdded ?? []),
      ...(entry.labelsRemoved ?? []),
    ]) {
      if (change.labelIds?.includes("STARRED") && change.message?.threadId) {
        starThreadIds.add(change.message.threadId);
      }
    }
  }
  return {
    ids: [...ids],
    threadIds: [...threadIds],
    starThreadIds: [...starThreadIds],
    historyId: data.historyId ?? startHistoryId,
  };
}

export async function gmailGetThread(
  credentials: GmailCredentials,
  threadId: string,
) {
  return authedFetch(
    credentials,
    `/threads/${encodeURIComponent(threadId)}?format=minimal`,
  ) as Promise<{
    messages?: { id: string; labelIds?: string[] }[];
  }>;
}

/** Full messages in a thread, including ones the mailbox owner sent. */
export async function gmailGetThreadMessages(
  credentials: GmailCredentials,
  threadId: string,
) {
  return authedFetch(
    credentials,
    `/threads/${encodeURIComponent(threadId)}?format=full`,
  ) as Promise<{ messages?: GmailMessage[] }>;
}

/** Newest INBOX messages, one page. Pass `pageToken` for the next older page. */
export async function gmailListInbox(
  credentials: GmailCredentials,
  max = 50,
  pageToken?: string,
) {
  const query = new URLSearchParams({
    labelIds: "INBOX",
    maxResults: String(max),
  });
  if (pageToken) query.set("pageToken", pageToken);
  const data = (await authedFetch(
    credentials,
    `/messages?${query.toString()}`,
  )) as {
    messages?: { id: string; threadId?: string }[];
    nextPageToken?: string;
    historyId?: string;
  };
  const messages = data.messages ?? [];
  return {
    ids: messages.map((m) => m.id),
    threadIds: [
      ...new Set(
        messages
          .map((m) => m.threadId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ],
    nextPageToken: data.nextPageToken ?? null,
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

export async function gmailModifyThread(
  credentials: GmailCredentials,
  threadId: string,
  change: { addLabelIds?: string[]; removeLabelIds?: string[] },
) {
  return authedFetch(
    credentials,
    `/threads/${encodeURIComponent(threadId)}/modify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    },
  );
}

export async function gmailTrashThread(
  credentials: GmailCredentials,
  threadId: string,
) {
  return authedFetch(
    credentials,
    `/threads/${encodeURIComponent(threadId)}/trash`,
    { method: "POST" },
  );
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
