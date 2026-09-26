import { getTranslations } from "next-intl/server";

import { InboxAgentFilter } from "@/components/inbox/inbox-agent-filter";
import { InboxLiveSync } from "@/components/inbox/inbox-live-sync";
import {
  InboxConnectEmpty,
  InboxDetailEmpty,
  InboxSplit,
} from "@/components/inbox/inbox-split";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import {
  inboxListFiltered,
  inboxListSearch,
  parseInboxListFilters,
} from "@/lib/inbox/filters";
import { listConversations, listIntegrations } from "@/lib/inbox/queries";
import {
  gmailOlderAvailable,
  gmailSyncGate,
  refreshGmailInbox,
} from "@/lib/integrations/gmail/sync";
import { can } from "@/lib/permissions";
import { listAssignableMembers } from "@/lib/properties/assignment";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    agent?: string;
    channel?: string;
    unanswered?: string;
  }>;
}) {
  const [ctx, t, params] = await Promise.all([
    getAppContext(),
    getTranslations("inbox"),
    searchParams,
  ]);
  const filters = parseInboxListFilters(params, ctx.user.id);
  const gate = await gmailSyncGate(ctx.user.id);
  if (gate.bootstrap) {
    try {
      await refreshGmailInbox(ctx.user.id);
    } catch {
      // Inbox still renders. The next visit retries the first INBOX import.
    }
  }

  const [hasOlder, { items, agents, rows }] = await Promise.all([
    gmailOlderAvailable(ctx.user.id).catch(() => false),
    withUserContext(ctx.user.id, async (tx) => {
      const [items, agents, rows] = await Promise.all([
        listConversations(tx, ctx.workspace.id, ctx.user.id, filters),
        listAssignableMembers(tx, ctx.workspace.id),
        listIntegrations(tx, ctx.user.id),
      ]);
      return { items, agents, rows };
    }),
  ]);

  const gmailConnected =
    rows.find((row) => row.kind === "gmail")?.status === "connected";
  const whatsappConnected =
    rows.find((row) => row.kind === "whatsapp")?.status === "connected";
  const canConnect = can(ctx.membership.role, "integrations.manage");
  const showConnectEmpty = items.length === 0 && !inboxListFiltered(filters);
  const waiting = gmailConnected && whatsappConnected;

  return (
    <>
      {gate.stale ? <InboxLiveSync /> : null}
      <InboxSplit
      items={items}
      search={inboxListSearch(params)}
      hasOlder={hasOlder}
      canCompose={can(ctx.membership.role, "inbox.write")}
      toolbar={
        <InboxAgentFilter
          currentUserId={ctx.user.id}
          agents={agents.map((a) => ({
            userId: a.userId,
            name: a.fullName ?? a.userId,
          }))}
        />
      }
    >
      {showConnectEmpty ? (
        <InboxConnectEmpty
          title={waiting ? t("empty_waiting_title") : t("empty_title")}
          description={
            waiting
              ? t("empty_waiting_description")
              : canConnect
                ? t("empty_description")
                : t("empty_staff")
          }
          gmailLabel={t("connect_gmail")}
          whatsappLabel={t("connect_whatsapp")}
          showGmail={canConnect && !gmailConnected}
          showWhatsapp={canConnect && !whatsappConnected}
        />
      ) : (
        <InboxDetailEmpty
          label={items.length === 0 ? t("empty_list") : t("select_thread")}
          composeHref={
            can(ctx.membership.role, "inbox.write") ? "/inbox/new" : undefined
          }
          composeLabel={t("compose")}
        />
      )}
    </InboxSplit>
    </>
  );
}
