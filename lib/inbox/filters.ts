import { uuidSchema } from "@/lib/properties/schema";

export const INBOX_CHANNEL_PARAMS = ["gmail", "whatsapp"] as const;
export type InboxChannelParam = (typeof INBOX_CHANNEL_PARAMS)[number];

export type InboxListFilters = {
  assignedUserId?: string;
  channel?: "email" | "whatsapp";
  unanswered?: boolean;
};

export function parseInboxChannel(
  value: string | undefined,
): InboxListFilters["channel"] {
  if (value === "gmail" || value === "email") return "email";
  if (value === "whatsapp") return "whatsapp";
  return undefined;
}

export function parseInboxListFilters(
  params: { agent?: string; channel?: string; unanswered?: string },
  currentUserId: string,
): InboxListFilters {
  const assignedUserId =
    params.agent === "me"
      ? currentUserId
      : params.agent && uuidSchema.safeParse(params.agent).success
        ? params.agent
        : undefined;
  return {
    assignedUserId,
    channel: parseInboxChannel(params.channel),
    unanswered: params.unanswered === "1",
  };
}

/** Query string that keeps the inbox list filter across `/inbox` and a thread. */
export function inboxListSearch(params: {
  agent?: string;
  channel?: string;
  unanswered?: string;
}) {
  const search = new URLSearchParams();
  if (
    params.channel === "gmail" ||
    params.channel === "email" ||
    params.channel === "whatsapp"
  ) {
    search.set(
      "channel",
      params.channel === "email" ? "gmail" : params.channel,
    );
  }
  if (params.unanswered === "1") search.set("unanswered", "1");
  if (params.agent) search.set("agent", params.agent);
  return search.toString();
}

export function inboxListFiltered(filters: InboxListFilters): boolean {
  return Boolean(
    filters.assignedUserId || filters.channel || filters.unanswered,
  );
}
