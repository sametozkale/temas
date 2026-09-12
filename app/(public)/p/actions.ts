"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { availabilityWindows, viewingCalendars } from "@/lib/db/schema";
import { minutesToTime } from "@/lib/slots";
import { secureToken } from "@/lib/slug";
import { enqueueMaterialize } from "@/lib/viewings/enqueue";
import {
  getCalendarByProperty,
  getInviteByToken,
} from "@/lib/viewings/queries";
import { weekSchema } from "@/lib/viewings/schema";
import { rruleForDay } from "@/lib/viewings/week";

export async function saveInviteeWeek(
  token: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const invite = await getInviteByToken(db, token);
  if (!invite) return actionError("not_found");

  const kind: "owner" | "current_tenant" =
    invite.person.relation === "owner" ? "owner" : "current_tenant";

  const calendarId = await db.transaction(async (tx) => {
    let calendar = await getCalendarByProperty(tx, invite.property.id);
    if (!calendar) {
      const [row] = await tx
        .insert(viewingCalendars)
        .values({
          propertyId: invite.property.id,
          publicToken: secureToken(),
        })
        .returning();
      calendar = row!;
    }
    await tx
      .delete(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.viewingCalendarId, calendar.id),
          eq(availabilityWindows.participantKind, kind),
          eq(availabilityWindows.contactId, invite.contact.id),
        ),
      );
    const enabled = parsed.data.filter((c) => c.enabled);
    if (enabled.length) {
      await tx.insert(availabilityWindows).values(
        enabled.map((c) => ({
          viewingCalendarId: calendar.id,
          participantKind: kind,
          contactId: invite.contact.id,
          rrule: rruleForDay(c.weekday),
          startTime: minutesToTime(c.startMin),
          endTime: minutesToTime(c.endMin),
          timezone: invite.property.timezone,
        })),
      );
    }
    await logActivity(
      {
        workspaceId: invite.property.workspaceId,
        propertyId: invite.property.id,
        action: "availability.updated",
        entity: "viewing_calendar",
        entityId: calendar.id,
        data: { kind, days: enabled.length },
      },
      tx,
    );
    return calendar.id;
  });

  await enqueueMaterialize(calendarId);
  revalidatePath(`/p/${token}`);
  revalidatePath(`/properties/${invite.property.id}/viewings`);
  return actionOk();
}
