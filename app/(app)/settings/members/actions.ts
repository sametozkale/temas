"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { WorkspaceInviteEmail } from "@/emails/workspace-invite";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { db, withUserContext } from "@/lib/db";
import { authUsers, invites, workspaceMembers } from "@/lib/db/schema";
import { publicAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/integrations/resend";
import { canAssignRole, requireAbility } from "@/lib/permissions";
import {
  isAssignableRole,
  oldestOwnerId,
  reassignPropertiesFromUser,
} from "@/lib/properties/assignment";
import { syncAssignedAgentWindows } from "@/lib/viewings/assignee";
import {
  INVITE_ROLES,
  INVITE_TTL_DAYS,
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from "@/lib/roles";
import { secureToken } from "@/lib/slug";

export type MembersState = ActionResult;

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(INVITE_ROLES),
});

async function deliverInvite(params: {
  email: string;
  role: (typeof INVITE_ROLES)[number];
  token: string;
  workspaceName: string;
  inviterName: string;
}) {
  const acceptUrl = new URL(
    `/invite/${params.token}`,
    await publicAppUrl(),
  ).toString();
  await sendEmail({
    to: params.email,
    subject: `You're invited to ${params.workspaceName} on Temas`,
    react: WorkspaceInviteEmail({
      workspaceName: params.workspaceName,
      inviterName: params.inviterName,
      role: params.role,
      acceptUrl,
      expiresInDays: INVITE_TTL_DAYS,
    }),
  });
}

export async function inviteMember(
  _prev: MembersState | undefined,
  formData: FormData,
): Promise<MembersState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "members.invite");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }
  const { email, role } = parsed.data;

  if (email === ctx.user.email?.toLowerCase()) {
    return actionError("self_invite");
  }

  const [alreadyMember] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .innerJoin(authUsers, eq(authUsers.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, ctx.workspace.id),
        sql`lower(${authUsers.email}) = ${email}`,
      ),
    )
    .limit(1);
  if (alreadyMember) return actionError("already_member");

  const token = secureToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

  const result = await withUserContext(ctx.user.id, async (tx) => {
    // Re-issuing: refresh token + expiry (and reopen an accepted row if they left).
    const [existing] = await tx
      .select({ id: invites.id })
      .from(invites)
      .where(
        and(
          eq(invites.workspaceId, ctx.workspace.id),
          eq(invites.email, email),
        ),
      )
      .orderBy(sql`${invites.acceptedAt} asc nulls first`)
      .limit(1);

    if (existing) {
      await tx
        .update(invites)
        .set({ role, token, expiresAt, acceptedAt: null })
        .where(eq(invites.id, existing.id));
    } else {
      await tx.insert(invites).values({
        workspaceId: ctx.workspace.id,
        email,
        role,
        token,
        expiresAt,
      });
    }

    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: existing ? "member.invite_resent" : "member.invited",
        entity: "invite",
        data: { email, role },
      },
      tx,
    );
    return { resent: Boolean(existing) };
  });

  try {
    await deliverInvite({
      email,
      role,
      token,
      workspaceName: ctx.workspace.name,
      inviterName: ctx.profile.fullName ?? ctx.user.email ?? "Temas",
    });
  } catch (err) {
    console.error("[invite] email delivery failed", err);
    return actionError("email_failed");
  }

  void result;
  revalidatePath("/settings/members");
  return actionOk();
}

export async function revokeInvite(inviteId: string): Promise<MembersState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "members.invite");
  const id = z.string().uuid().parse(inviteId);

  await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .delete(invites)
      .where(and(eq(invites.id, id), eq(invites.workspaceId, ctx.workspace.id)))
      .returning({ email: invites.email });
    if (row) {
      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          action: "member.invite_revoked",
          entity: "invite",
          entityId: id,
          data: { email: row.email },
        },
        tx,
      );
    }
  });

  revalidatePath("/settings/members");
  return actionOk();
}

const roleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(WORKSPACE_ROLES),
});

async function countOwners(workspaceId: string) {
  const rows = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "owner"),
      ),
    );
  return rows.length;
}

export async function updateMemberRole(
  memberId: string,
  role: WorkspaceRole,
): Promise<MembersState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "members.update");
  const parsed = roleSchema.safeParse({ memberId, role });
  if (!parsed.success) return actionError("invalid");
  if (!canAssignRole(ctx.membership.role, parsed.data.role)) {
    return actionError("forbidden");
  }

  const [target] = await db
    .select({ role: workspaceMembers.role, userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, parsed.data.memberId),
        eq(workspaceMembers.workspaceId, ctx.workspace.id),
      ),
    )
    .limit(1);
  if (!target) return actionError("not_found");

  if (
    target.role === "owner" &&
    parsed.data.role !== "owner" &&
    (await countOwners(ctx.workspace.id)) <= 1
  ) {
    return actionError("last_owner");
  }

  await withUserContext(ctx.user.id, async (tx) => {
    if (!isAssignableRole(parsed.data.role)) {
      const fallback = await oldestOwnerId(tx, ctx.workspace.id, target.userId);
      if (fallback) {
        const ids = await reassignPropertiesFromUser(
          tx,
          ctx.workspace.id,
          target.userId,
          fallback,
        );
        for (const propertyId of ids) {
          await syncAssignedAgentWindows(
            tx,
            propertyId,
            ctx.workspace.id,
            fallback,
            null,
          );
          await logActivity(
            {
              workspaceId: ctx.workspace.id,
              actorId: ctx.user.id,
              propertyId,
              action: "property.reassigned",
              entity: "property",
              entityId: propertyId,
              data: { from: target.userId, to: fallback },
            },
            tx,
          );
        }
      }
    }
    await tx
      .update(workspaceMembers)
      .set({ role: parsed.data.role })
      .where(eq(workspaceMembers.id, parsed.data.memberId));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "member.role_changed",
        entity: "workspace_member",
        entityId: parsed.data.memberId,
        data: {
          from: target.role,
          to: parsed.data.role,
          userId: target.userId,
        },
      },
      tx,
    );
  });

  revalidatePath("/settings/members");
  return actionOk();
}

export async function removeMember(memberId: string): Promise<MembersState> {
  const ctx = await getAppContext();
  const id = z.string().uuid().parse(memberId);

  const [target] = await db
    .select({ role: workspaceMembers.role, userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, id),
        eq(workspaceMembers.workspaceId, ctx.workspace.id),
      ),
    )
    .limit(1);
  if (!target) return actionError("not_found");

  const isSelf = target.userId === ctx.user.id;
  if (!isSelf) requireAbility(ctx.membership, "members.remove");

  if (target.role === "owner" && (await countOwners(ctx.workspace.id)) <= 1) {
    return actionError("last_owner");
  }

  await withUserContext(ctx.user.id, async (tx) => {
    const fallback = await oldestOwnerId(tx, ctx.workspace.id, target.userId);
    if (fallback) {
      const ids = await reassignPropertiesFromUser(
        tx,
        ctx.workspace.id,
        target.userId,
        fallback,
      );
      for (const propertyId of ids) {
        await syncAssignedAgentWindows(
          tx,
          propertyId,
          ctx.workspace.id,
          fallback,
          null,
        );
        await logActivity(
          {
            workspaceId: ctx.workspace.id,
            actorId: ctx.user.id,
            propertyId,
            action: "property.reassigned",
            entity: "property",
            entityId: propertyId,
            data: { from: target.userId, to: fallback },
          },
          tx,
        );
      }
    }
    await tx.delete(workspaceMembers).where(eq(workspaceMembers.id, id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: isSelf ? "member.left" : "member.removed",
        entity: "workspace_member",
        entityId: id,
        data: { userId: target.userId, role: target.role },
      },
      tx,
    );
  });

  revalidatePath("/", "layout");
  return actionOk();
}
