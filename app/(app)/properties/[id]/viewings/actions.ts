"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import {
  availabilityWindows,
  properties,
  viewingCalendars,
} from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";
import { uuidSchema } from "@/lib/properties/schema";
import { secureToken } from "@/lib/slug";
import { minutesToTime } from "@/lib/slots";
import { revalidatePublicPropertyPages } from "@/lib/public-cache";
import { ensureAssigneeContact } from "@/lib/viewings/assignee";
import { enqueueMaterialize } from "@/lib/viewings/enqueue";
import { getCalendarByProperty } from "@/lib/viewings/queries";
import { calendarSettingsSchema, weekSchema } from "@/lib/viewings/schema";
import { rruleForDay } from "@/lib/viewings/week";

export type ViewingActionResult<T = undefined> = ActionResult<T>;

async function revalidateViewings(propertyId: string) {
  revalidatePath(`/properties/${propertyId}/viewings`);
  revalidatePath("/calendar");
  await revalidatePublicPropertyPages(propertyId);
}

export async function ensureViewingCalendar(
  propertyId: string,
): Promise<ViewingActionResult<{ calendarId: string }>> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "calendar.manage");
  const id = uuidSchema.parse(propertyId);

  const calendarId = await withUserContext(ctx.user.id, async (tx) => {
    const existing = await getCalendarByProperty(tx, id);
    if (existing) return existing.id;
    const [row] = await tx
      .insert(viewingCalendars)
      .values({ propertyId: id, publicToken: secureToken() })
      .returning({ id: viewingCalendars.id });
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "calendar.created",
        entity: "viewing_calendar",
        entityId: row!.id,
      },
      tx,
    );
    return row!.id;
  });

  await revalidateViewings(id);
  return actionOk({ calendarId });
}

export async function updateCalendarSettings(
  propertyId: string,
  input: unknown,
): Promise<ViewingActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "calendar.manage");
  const id = uuidSchema.parse(propertyId);
  const parsed = calendarSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }

  const calendarId = await withUserContext(ctx.user.id, async (tx) => {
    const current = await getCalendarByProperty(tx, id);
    if (!current) return null;
    await tx
      .update(viewingCalendars)
      .set({
        slotDurationMin: parsed.data.slotDurationMin,
        bufferMin: parsed.data.bufferMin,
        minNoticeHours: parsed.data.minNoticeHours,
        maxDaysAhead: parsed.data.maxDaysAhead,
        isPublished: parsed.data.isPublished ?? current.isPublished,
        requireFormFirst:
          parsed.data.requireFormFirst ?? current.requireFormFirst,
        formId:
          parsed.data.formId === undefined
            ? current.formId
            : parsed.data.formId,
      })
      .where(eq(viewingCalendars.id, current.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action:
          parsed.data.isPublished && !current.isPublished
            ? "calendar.published"
            : "calendar.updated",
        entity: "viewing_calendar",
        entityId: current.id,
      },
      tx,
    );
    return current.id;
  });

  if (!calendarId) return actionError("not_found");
  await enqueueMaterialize(calendarId);
  await revalidateViewings(id);
  return actionOk();
}

export async function saveAgentWeek(
  propertyId: string,
  input: unknown,
): Promise<ViewingActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "calendar.manage");
  const id = uuidSchema.parse(propertyId);
  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const calendarId = await withUserContext(ctx.user.id, async (tx) => {
    const calendar = await getCalendarByProperty(tx, id);
    if (!calendar) return null;
    const [property] = await tx
      .select({
        timezone: properties.timezone,
        assignedUserId: properties.assignedUserId,
      })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);
    const timezone = property?.timezone ?? ctx.workspace.timezone;
    const assigneeId = property?.assignedUserId ?? ctx.user.id;
    const contactId = await ensureAssigneeContact(
      tx,
      ctx.workspace.id,
      assigneeId,
      assigneeId === ctx.user.id ? ctx.user.email : null,
    );
    await tx
      .delete(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.viewingCalendarId, calendar.id),
          eq(availabilityWindows.participantKind, "agent"),
        ),
      );
    const enabled = parsed.data.filter((c) => c.enabled);
    if (enabled.length) {
      await tx.insert(availabilityWindows).values(
        enabled.map((c) => ({
          viewingCalendarId: calendar.id,
          participantKind: "agent" as const,
          contactId,
          rrule: rruleForDay(c.weekday),
          startTime: minutesToTime(c.startMin),
          endTime: minutesToTime(c.endMin),
          timezone,
        })),
      );
    }
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "availability.updated",
        entity: "viewing_calendar",
        entityId: calendar.id,
        data: { kind: "agent", days: enabled.length },
      },
      tx,
    );
    return calendar.id;
  });

  if (!calendarId) return actionError("not_found");
  await enqueueMaterialize(calendarId);
  await revalidateViewings(id);
  return actionOk();
}
