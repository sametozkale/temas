"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { requireUser, writeWorkspaceCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { invites, profiles, workspaceMembers } from "@/lib/db/schema";

export type AcceptInviteState = ActionResult;

/**
 * Invite acceptance runs in system context: the accepting user is not yet a
 * member, so RLS could not admit the membership insert. The token itself is
 * the credential; email must match the signed-in account.
 */
export async function acceptInvite(
  _prev: AcceptInviteState | undefined,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = z.string().min(16).max(128).parse(formData.get("token"));
  const fullName = z
    .string()
    .trim()
    .max(80)
    .optional()
    .parse(formData.get("fullName") ?? undefined);
  const user = await requireUser(`/invite/${token}`);

  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt)))
    .limit(1);

  if (!invite) return actionError("not_found");
  if (invite.expiresAt < new Date()) return actionError("expired");
  if (!user.email || invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return actionError("email_mismatch");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      })
      .onConflictDoNothing();
    await tx
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, invite.id));
    if (fullName) {
      await tx
        .insert(profiles)
        .values({ id: user.id, fullName })
        .onConflictDoUpdate({ target: profiles.id, set: { fullName } });
    }
    await logActivity(
      {
        workspaceId: invite.workspaceId,
        actorId: user.id,
        action: "member.joined",
        entity: "workspace_member",
        data: { role: invite.role, email: invite.email },
      },
      tx,
    );
  });

  const cookieStore = await cookies();
  writeWorkspaceCookie(cookieStore, invite.workspaceId);
  redirect("/home");
}
