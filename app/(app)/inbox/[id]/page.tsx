import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { InboxAgentFilter } from "@/components/inbox/inbox-agent-filter";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { InboxLiveSync } from "@/components/inbox/inbox-live-sync";
import { InboxSplit } from "@/components/inbox/inbox-split";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { conversations, profiles } from "@/lib/db/schema";
import { inboxListSearch, parseInboxListFilters } from "@/lib/inbox/filters";
import { gmailOlderAvailable } from "@/lib/integrations/gmail/sync";
import {
  getConversation,
  listConversations,
  listMessages,
} from "@/lib/inbox/queries";
import { TONES } from "@/lib/ai/types";
import { can } from "@/lib/permissions";
import { listAssignableMembers } from "@/lib/properties/assignment";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    agent?: string;
    channel?: string;
    unanswered?: string;
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const ctx = await getAppContext();
  const filters = parseInboxListFilters(query, ctx.user.id);
  const hasOlder = await gmailOlderAvailable(ctx.user.id).catch(() => false);
  const { items, thread, tone, agents } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const [prefs] = await tx
        .select({ tone: profiles.aiTone })
        .from(profiles)
        .where(eq(profiles.id, ctx.user.id))
        .limit(1);
      const found = await getConversation(
        tx,
        ctx.workspace.id,
        ctx.user.id,
        id,
      );
      if (!found) {
        const [items, agents] = await Promise.all([
          listConversations(tx, ctx.workspace.id, ctx.user.id, filters),
          listAssignableMembers(tx, ctx.workspace.id),
        ]);
        return { items, thread: null, tone: prefs?.tone, agents };
      }
      if (!found.conversation.isRead) {
        await tx
          .update(conversations)
          .set({ isRead: true })
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceId, ctx.workspace.id),
              eq(conversations.userId, ctx.user.id),
            ),
          );
      }
      const [items, messages, agents] = await Promise.all([
        listConversations(tx, ctx.workspace.id, ctx.user.id, filters),
        listMessages(tx, id),
        listAssignableMembers(tx, ctx.workspace.id),
      ]);
      return {
        items,
        thread: { ...found, messages },
        tone: prefs?.tone,
        agents,
      };
    },
  );
  if (!thread) notFound();
  const defaultTone = TONES.find((value) => value === tone) ?? "friendly";

  return (
    <>
      {thread.conversation.channel === "email" ? (
        <InboxLiveSync conversationId={id} />
      ) : null}
      <InboxSplit
      items={items}
      selectedId={id}
      search={inboxListSearch(query)}
      hasOlder={hasOlder}
      canCompose={can(ctx.membership.role, "inbox.write")}
      toolbar={
        <InboxAgentFilter
          currentUserId={ctx.user.id}
          agents={agents.map((agent) => ({
            userId: agent.userId,
            name: agent.fullName ?? agent.userId,
          }))}
        />
      }
    >
      <ConversationThread
        conversationId={id}
        subject={thread.conversation.subject}
        channel={thread.conversation.channel}
        contactName={thread.contactName}
        contactEmail={thread.contactEmail}
        propertyId={thread.propertyId}
        propertyTitle={thread.propertyTitle}
        messages={thread.messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          body: m.body,
          bodyHtml: m.bodyHtml,
          from: typeof m.meta.from === "string" ? m.meta.from : null,
          sentAt: m.sentAt,
          createdAt: m.createdAt,
        }))}
        canReply={can(ctx.membership.role, "inbox.write")}
        canDraft={can(ctx.membership.role, "ai.use")}
        canManage={can(ctx.membership.role, "inbox.write")}
        starred={thread.conversation.starred}
        defaultTone={defaultTone}
      />
    </InboxSplit>
    </>
  );
}
