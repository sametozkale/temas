import { logActivity } from "@/lib/activity";
import type { Tx } from "@/lib/db";
import { contacts, workspaceMembers, workspaces } from "@/lib/db/schema";
import { randomSuffix, slugify } from "@/lib/slug";

export async function insertOwnedWorkspace(
  tx: Tx,
  input: {
    name: string;
    timezone: string;
    ownerUserId: string;
    ownerName: string;
    ownerEmail: string | null;
  },
) {
  const base = slugify(input.name) || "workspace";
  const [ws] = await tx
    .insert(workspaces)
    .values({
      name: input.name,
      slug: `${base}-${randomSuffix()}`,
      timezone: input.timezone,
      plan: "free",
    })
    .returning({ id: workspaces.id });
  if (!ws) throw new Error("workspace_insert_failed");

  await tx.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId: input.ownerUserId,
    role: "owner",
  });

  if (input.ownerEmail) {
    await tx
      .insert(contacts)
      .values({
        workspaceId: ws.id,
        userId: input.ownerUserId,
        fullName: input.ownerName,
        email: input.ownerEmail,
        emailVerified: true,
      })
      .onConflictDoNothing();
  }

  await logActivity(
    {
      workspaceId: ws.id,
      actorId: input.ownerUserId,
      action: "workspace.created",
      entity: "workspace",
      entityId: ws.id,
      data: { name: input.name },
    },
    tx,
  );

  return ws.id;
}

export function isMembershipWorkspace(
  memberships: { workspaceId: string }[],
  workspaceId: string,
) {
  return memberships.some((m) => m.workspaceId === workspaceId);
}
