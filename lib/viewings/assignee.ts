import { and, eq } from "drizzle-orm";

import { ensureMemberContact } from "@/lib/contacts/ensure";
import type { Tx } from "@/lib/db";
import {
  authUsers,
  availabilityWindows,
  profiles,
  viewingCalendars,
} from "@/lib/db/schema";

/** Point agent listing hours at the assigned member's contact. */
export async function syncAssignedAgentWindows(
  tx: Tx,
  propertyId: string,
  workspaceId: string,
  assignedUserId: string | null,
) {
  if (!assignedUserId) return;
  const [calendar] = await tx
    .select({ id: viewingCalendars.id })
    .from(viewingCalendars)
    .where(eq(viewingCalendars.propertyId, propertyId))
    .limit(1);
  if (!calendar) return;

  const [user] = await tx
    .select({
      id: authUsers.id,
      email: authUsers.email,
      fullName: profiles.fullName,
    })
    .from(authUsers)
    .leftJoin(profiles, eq(profiles.id, authUsers.id))
    .where(eq(authUsers.id, assignedUserId))
    .limit(1);
  if (!user) return;

  const contactId = await ensureMemberContact(
    tx,
    workspaceId,
    { id: user.id, email: user.email },
    user.fullName || user.email || "Agent",
  );

  await tx
    .update(availabilityWindows)
    .set({ contactId })
    .where(
      and(
        eq(availabilityWindows.viewingCalendarId, calendar.id),
        eq(availabilityWindows.participantKind, "agent"),
      ),
    );
}
