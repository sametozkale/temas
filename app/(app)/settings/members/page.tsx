import { and, desc, eq, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { invites, profiles, workspaceMembers } from "@/lib/db/schema";
import { can } from "@/lib/permissions";

import { InviteDialog } from "./invite-dialog";
import { InvitesTable, MembersTable } from "./members-tables";

export default async function MembersPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("settings.members");

  const { members, pending } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const members = await tx
        .select({
          id: workspaceMembers.id,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          fullName: profiles.fullName,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, ctx.workspace.id))
        .orderBy(workspaceMembers.createdAt);

      const pending = await tx
        .select({
          id: invites.id,
          email: invites.email,
          role: invites.role,
          expiresAt: invites.expiresAt,
        })
        .from(invites)
        .where(
          and(
            eq(invites.workspaceId, ctx.workspace.id),
            isNull(invites.acceptedAt),
          ),
        )
        .orderBy(desc(invites.createdAt));

      return { members, pending };
    },
  );

  const canInvite = can(ctx.membership.role, "members.invite");
  const canManage = can(ctx.membership.role, "members.update");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium">{t("members_title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("members_count", { count: members.length })}
            </p>
          </div>
          {canInvite ? <InviteDialog /> : null}
        </div>
        <MembersTable
          members={members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            fullName: m.fullName,
            isSelf: m.userId === ctx.user.id,
          }))}
          canManage={canManage}
        />
      </section>

      {canInvite ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-medium">{t("pending_title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("pending_description")}
            </p>
          </div>
          <InvitesTable
            invites={pending.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              expiresAt: i.expiresAt.toISOString(),
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
