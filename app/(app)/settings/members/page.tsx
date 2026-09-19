import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import {
  SettingsGroup,
  SettingsPage,
} from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import {
  invites,
  profiles,
  properties,
  workspaceMembers,
} from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { avatarPublicUrl } from "@/lib/storage-constants";

import { InviteDialog } from "./invite-dialog";
import { InvitesTable, MembersTable } from "./members-tables";

export default async function MembersPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("settings.members");

  const { members, pending, listingCounts } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const members = await tx
        .select({
          id: workspaceMembers.id,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          fullName: profiles.fullName,
          avatarUrl: profiles.avatarUrl,
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

      const listingCounts = await tx
        .select({
          userId: properties.assignedUserId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(properties)
        .where(
          and(
            eq(properties.workspaceId, ctx.workspace.id),
            isNull(properties.deletedAt),
          ),
        )
        .groupBy(properties.assignedUserId);

      return { members, pending, listingCounts };
    },
  );

  const canInvite = can(ctx.membership.role, "members.invite");
  const canManage = can(ctx.membership.role, "members.update");

  const countByUser = new Map(
    listingCounts
      .filter((row) => row.userId)
      .map((row) => [row.userId as string, row.count]),
  );

  return (
    <SettingsPage
      title={t("members_title")}
      actions={canInvite ? <InviteDialog /> : null}
    >
      <SettingsGroup>
        <MembersTable
          members={members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            fullName: m.fullName,
            avatarUrl: avatarPublicUrl(m.avatarUrl),
            isSelf: m.userId === ctx.user.id,
            listingCount: countByUser.get(m.userId) ?? 0,
          }))}
          canManage={canManage}
        />
      </SettingsGroup>

      {canInvite ? (
        <SettingsGroup
          title={t("pending_title")}
          footer={t("pending_description")}
        >
          <InvitesTable
            invites={pending.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              expiresAt: i.expiresAt.toISOString(),
            }))}
          />
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}
