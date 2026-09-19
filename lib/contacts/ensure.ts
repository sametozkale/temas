import { and, eq } from "drizzle-orm";

import type { Tx } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

/** Ensure a workspace contact exists for a staff member (viewing participant). */
export async function ensureMemberContact(
  tx: Tx,
  workspaceId: string,
  user: { id: string; email: string | null },
  fullName: string,
) {
  const [existing] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(eq(contacts.workspaceId, workspaceId), eq(contacts.userId, user.id)),
    )
    .limit(1);
  if (existing) return existing.id;
  const [row] = await tx
    .insert(contacts)
    .values({
      workspaceId,
      userId: user.id,
      fullName,
      email: user.email,
      emailVerified: Boolean(user.email),
    })
    .returning({ id: contacts.id });
  return row!.id;
}
