import { and, asc, eq, isNotNull } from "drizzle-orm";

import { InboxAgentFilter } from "@/components/inbox/inbox-agent-filter";
import { ComposeForm } from "@/components/inbox/compose-form";
import { InboxSplit } from "@/components/inbox/inbox-split";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { inboxListSearch, parseInboxListFilters } from "@/lib/inbox/filters";
import { listConversations } from "@/lib/inbox/queries";
import { gmailOlderAvailable } from "@/lib/integrations/gmail/sync";
import { can } from "@/lib/permissions";
import { listAssignableMembers } from "@/lib/properties/assignment";

export default async function NewEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    agent?: string;
    channel?: string;
    unanswered?: string;
  }>;
}) {
  const [ctx, query] = await Promise.all([getAppContext(), searchParams]);
  const filters = parseInboxListFilters(query, ctx.user.id);
  const hasOlder = await gmailOlderAvailable(ctx.user.id).catch(() => false);
  const { items, agents, people } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const [items, agents, people] = await Promise.all([
        listConversations(tx, ctx.workspace.id, ctx.user.id, filters),
        listAssignableMembers(tx, ctx.workspace.id),
        tx
          .select({
            id: contacts.id,
            name: contacts.fullName,
            email: contacts.email,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, ctx.workspace.id),
              isNotNull(contacts.email),
            ),
          )
          .orderBy(asc(contacts.fullName))
          .limit(500),
      ]);
      return { items, agents, people };
    },
  );

  return (
    <InboxSplit
      items={items}
      selectedId="new"
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
      <ComposeForm
        contacts={people.flatMap((person) =>
          person.email
            ? [{ id: person.id, name: person.name, email: person.email }]
            : [],
        )}
      />
    </InboxSplit>
  );
}
