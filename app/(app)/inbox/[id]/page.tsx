import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { ConversationThread } from "@/components/inbox/conversation-thread";
import { InboxSplit } from "@/components/inbox/inbox-split";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { conversations, profiles } from "@/lib/db/schema";
import {
  getConversation,
  listConversations,
  listMessages,
} from "@/lib/inbox/queries";
import { TONES } from "@/lib/ai/types";
import { can } from "@/lib/permissions";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppContext();
  const { items, thread, tone } = await withUserContext(
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
        const items = await listConversations(
          tx,
          ctx.workspace.id,
          ctx.user.id,
        );
        return { items, thread: null, tone: prefs?.tone };
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
      const [items, messages] = await Promise.all([
        listConversations(tx, ctx.workspace.id, ctx.user.id),
        listMessages(tx, id),
      ]);
      return { items, thread: { ...found, messages }, tone: prefs?.tone };
    },
  );
  if (!thread) notFound();
  const defaultTone = TONES.find((value) => value === tone) ?? "friendly";

  return (
    <InboxSplit items={items} selectedId={id}>
        <ConversationThread
          conversationId={id}
          subject={thread.conversation.subject}
          contactName={thread.contactName}
          contactEmail={thread.contactEmail}
          propertyId={thread.propertyId}
          propertyTitle={thread.propertyTitle}
          messages={thread.messages.map((m) => ({
            id: m.id,
            direction: m.direction,
            body: m.body,
            sentAt: m.sentAt,
            createdAt: m.createdAt,
          }))}
          canReply={can(ctx.membership.role, "inbox.write")}
          canDraft={can(ctx.membership.role, "ai.use")}
          defaultTone={defaultTone}
        />
      </InboxSplit>
  );
}
