import { AppShell } from "@/components/app-shell";
import { getAppContext, initialsOf } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { recentProperties } from "@/lib/properties/queries";

/**
 * Protected workspace area. `getAppContext` redirects to /login when signed
 * out and to /onboarding when the user has no workspace yet.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();
  const displayName = ctx.profile.fullName ?? ctx.user.email ?? "—";
  const shortcuts = await withUserContext(ctx.user.id, (tx) =>
    recentProperties(tx, ctx.workspace.id),
  );

  return (
    <AppShell
      workspace={{
        id: ctx.workspace.id,
        name: ctx.workspace.name,
        initials: initialsOf(ctx.workspace.name, "H"),
      }}
      user={{
        name: displayName,
        email: ctx.user.email ?? undefined,
        initials: initialsOf(ctx.profile.fullName ?? ctx.user.email),
      }}
      workspaces={ctx.memberships.map((m) => ({
        id: m.workspaceId,
        name: m.name,
        role: m.role,
      }))}
      shortcuts={shortcuts.map((p) => ({
        id: p.id,
        title: p.title,
        href: `/properties/${p.id}`,
      }))}
    >
      {children}
    </AppShell>
  );
}
