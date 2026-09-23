import { and, eq } from "drizzle-orm";

import { ensureMemberContact } from "@/lib/contacts/ensure";
import type { Tx } from "@/lib/db";
import {
  availabilityWindows,
  contacts,
  profiles,
  viewingCalendars,
} from "@/lib/db/schema";

/** Staff contact for viewing windows — never query auth.users under RLS. */
export async function ensureAssigneeContact(
  tx: Tx,
  workspaceId: string,
  userId: string,
  fallbackEmail: string | null,
) {
  const [[profile], [memberContact]] = await Promise.all([
    tx
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    tx
      .select({ email: contacts.email, fullName: contacts.fullName })
      .from(contacts)
      .where(
        and(eq(contacts.workspaceId, workspaceId), eq(contacts.userId, userId)),
      )
      .limit(1),
  ]);

  const email = memberContact?.email ?? fallbackEmail;
  const fullName =
    profile?.fullName?.trim() ||
    memberContact?.fullName?.trim() ||
    email ||
    "Agent";

  return ensureMemberContact(tx, workspaceId, { id: userId, email }, fullName);
}

/** Point agent listing hours at the assigned member's contact. */
export async function syncAssignedAgentWindows(
  tx: Tx,
  propertyId: string,
  workspaceId: string,
  assignedUserId: string | null,
  fallbackEmail: string | null,
) {
  if (!assignedUserId) return;
  const [calendar] = await tx
    .select({ id: viewingCalendars.id })
    .from(viewingCalendars)
    .where(eq(viewingCalendars.propertyId, propertyId))
    .limit(1);
  if (!calendar) return;

  const contactId = await ensureAssigneeContact(
    tx,
    workspaceId,
    assignedUserId,
    fallbackEmail,
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
