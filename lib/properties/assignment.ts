import { and, asc, eq, inArray } from "drizzle-orm";

import type { Tx } from "@/lib/db";
import { profiles, properties, workspaceMembers } from "@/lib/db/schema";
import type { WorkspaceRole } from "@/lib/roles";

/** Roles that may be the responsible agent on a listing (docs/00 §2). */
export const ASSIGNABLE_ROLES: readonly WorkspaceRole[] = ["owner", "agent"];

export function isAssignableRole(
  role: WorkspaceRole | string | null | undefined,
): boolean {
  return role === "owner" || role === "agent";
}

export type AssignableMember = {
  userId: string;
  role: WorkspaceRole;
  fullName: string | null;
  avatarUrl: string | null;
};

/**
 * Default assignee: the creator when they are owner/agent, otherwise the
 * oldest owner in the workspace.
 */
export async function resolveAssignedUserId(
  tx: Tx,
  workspaceId: string,
  creatorUserId: string,
  requestedUserId?: string | null,
): Promise<string | null> {
  const wanted = requestedUserId || creatorUserId;
  const members = await tx
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));

  const requested = members.find((m) => m.userId === wanted);
  if (requested && isAssignableRole(requested.role)) return requested.userId;

  const oldestOwner = members.find((m) => m.role === "owner");
  return oldestOwner?.userId ?? null;
}

export async function assertAssignableMember(
  tx: Tx,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row && isAssignableRole(row.role));
}

export async function oldestOwnerId(
  tx: Tx,
  workspaceId: string,
  exceptUserId?: string,
): Promise<string | null> {
  const members = await tx
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));
  const owner = members.find(
    (m) => m.role === "owner" && m.userId !== exceptUserId,
  );
  return owner?.userId ?? null;
}

export async function listAssignableMembers(
  tx: Tx,
  workspaceId: string,
): Promise<AssignableMember[]> {
  return tx
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(workspaceMembers)
    .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        inArray(workspaceMembers.role, [...ASSIGNABLE_ROLES]),
      ),
    )
    .orderBy(asc(workspaceMembers.createdAt));
}

/** Every workspace member — task assignees are not limited to owner|agent. */
export async function listWorkspaceMembers(
  tx: Tx,
  workspaceId: string,
): Promise<AssignableMember[]> {
  return tx
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(workspaceMembers)
    .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));
}

/** Move listings off a departing / demoted member onto the oldest remaining owner. */
export async function reassignPropertiesFromUser(
  tx: Tx,
  workspaceId: string,
  fromUserId: string,
  toUserId: string,
) {
  const rows = await tx
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        eq(properties.assignedUserId, fromUserId),
      ),
    );
  if (rows.length === 0) return [];
  await tx
    .update(properties)
    .set({ assignedUserId: toUserId })
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        eq(properties.assignedUserId, fromUserId),
      ),
    );
  return rows.map((r) => r.id);
}
