import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { listThreads } from "@/lib/ai/ask";
import { getAppContext, initialsOf } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { countUnread } from "@/lib/inbox/queries";

/**
 * Protected workspace area. `getAppContext` redirects to /login when signed
 * out and to /onboarding when the user has no workspace yet.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ctx, t] = await Promise.all([
    getAppContext(),
    getTranslations("nav"),
  ]);
  const displayName = ctx.profile.fullName ?? ctx.user.email ?? "—";
  const { chats, inboxUnread } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const [chats, inboxUnread] = await Promise.all([
        listThreads(tx, ctx.workspace.id, ctx.user.id),
        countUnread(tx, ctx.workspace.id, ctx.user.id),
      ]);
      return { chats, inboxUnread };
    },
  );

  return (
    <AppShell
      workspace={{
        id: ctx.workspace.id,
        name: ctx.workspace.name,
        initials: initialsOf(ctx.workspace.name, "H"),
        timezone: ctx.workspace.timezone,
        imageUrl: ctx.workspace.logoUrl,
      }}
      user={{
        name: displayName,
        email: ctx.user.email ?? undefined,
        initials: initialsOf(ctx.profile.fullName ?? ctx.user.email),
        imageUrl: ctx.profile.avatarUrl,
      }}
      workspaces={ctx.memberships.map((m) => ({
        id: m.workspaceId,
        name: m.name,
        role: m.role,
        imageUrl: m.logoUrl,
      }))}
      chats={chats.map((thread) => ({
        id: thread.id,
        title: thread.title?.trim() || t("untitled_chat"),
        href: `/home?thread=${thread.id}`,
      }))}
      inboxUnread={inboxUnread}
    >
      {children}
    </AppShell>
  );
}
