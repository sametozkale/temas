import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import type { AppContext } from "@/lib/auth";
import { withUserContext, type Tx } from "@/lib/db";
import {
  bookings,
  contacts,
  properties,
  viewingCalendars,
  viewingSlots,
} from "@/lib/db/schema";
import { formatAddress, formatDateTime } from "@/lib/format";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { revalidatePublicPropertyPages } from "@/lib/public-cache";
import { secureToken } from "@/lib/slug";
import { enqueueMaterialize } from "@/lib/viewings/enqueue";
import {
  notifyWorkspaceParties,
  sendProspectCancellation,
  sendProspectConfirmation,
} from "@/lib/viewings/notify";

const slotTarget = {
  slotId: z.string().uuid().optional(),
  /** ISO start time; resolved to the open slot that starts exactly then. */
  startsAt: z.string().datetime({ offset: true }).optional(),
};

export const staffBookingSchema = z
  .object({
    propertyId: z.string().uuid(),
    ...slotTarget,
    fullName: z.string().trim().min(2).max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v.replace(/[^\d+]/g, "") : "")),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.slotId || v.startsAt, { path: ["slotId"], message: "slot" })
  .refine((v) => v.email || v.phone, { path: ["email"], message: "contact" });

export const cancelViewingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
});

export const rescheduleViewingSchema = z
  .object({ bookingId: z.string().uuid(), ...slotTarget })
  .refine((v) => v.slotId || v.startsAt, { path: ["slotId"], message: "slot" });

type Gate = ActionResult<never> | null;

function gate(ctx: AppContext): Gate {
  try {
    requireAbility(ctx.membership, "calendar.manage");
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
}

async function loadProperty(tx: Tx, workspaceId: string, propertyId: string) {
  const [row] = await tx
    .select({ property: properties, calendarId: viewingCalendars.id })
    .from(properties)
    .innerJoin(viewingCalendars, eq(viewingCalendars.propertyId, properties.id))
    .where(
      and(eq(properties.id, propertyId), eq(properties.workspaceId, workspaceId)),
    )
    .limit(1);
  return row ?? null;
}

/** Locks an open slot on the calendar; null when it is gone or taken. */
async function lockSlot(
  tx: Tx,
  calendarId: string,
  target: { slotId?: string; startsAt?: string },
) {
  const match = target.slotId
    ? eq(viewingSlots.id, target.slotId)
    : eq(viewingSlots.startsAt, new Date(target.startsAt!));
  const [locked] = await tx
    .update(viewingSlots)
    .set({ status: "booked" })
    .where(
      and(
        match,
        eq(viewingSlots.viewingCalendarId, calendarId),
        eq(viewingSlots.status, "open"),
      ),
    )
    .returning();
  return locked ?? null;
}

function revalidateViewings(propertyId: string) {
  revalidatePath(`/properties/${propertyId}/viewings`);
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export type StaffBookingResult = {
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  startsAt: string;
  whenLabel: string;
};

/** Agent books an open slot on behalf of a prospect (docs/04 §4.1). */
export async function bookViewingCore(
  ctx: AppContext,
  input: unknown,
): Promise<ActionResult<StaffBookingResult>> {
  const denied = gate(ctx);
  if (denied) return denied;
  const parsed = staffBookingSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const cancelToken = secureToken();

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const found = await loadProperty(tx, ctx.workspace.id, v.propertyId);
    if (!found) return "no_calendar" as const;
    const slot = await lockSlot(tx, found.calendarId, v);
    if (!slot) return "slot_taken" as const;

    const matchers = [
      v.email ? eq(contacts.email, v.email) : null,
      v.phone ? eq(contacts.phone, v.phone) : null,
    ].filter((m): m is NonNullable<typeof m> => m !== null);
    const [existing] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, ctx.workspace.id), or(...matchers)))
      .limit(1);
    const contactId =
      existing?.id ??
      (
        await tx
          .insert(contacts)
          .values({
            workspaceId: ctx.workspace.id,
            fullName: v.fullName,
            email: v.email || null,
            phone: v.phone || null,
          })
          .returning({ id: contacts.id })
      )[0]!.id;

    const [booking] = await tx
      .insert(bookings)
      .values({
        viewingSlotId: slot.id,
        propertyId: found.property.id,
        contactId,
        cancelToken,
        status: "confirmed",
        note: v.note ?? null,
      })
      .returning({ id: bookings.id });

    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: found.property.id,
        action: "booking.created",
        entity: "booking",
        entityId: booking!.id,
        data: { slotId: slot.id, by: "staff", fullName: v.fullName },
      },
      tx,
    );
    return { slot, property: found.property, calendarId: found.calendarId, bookingId: booking!.id };
  });

  if (typeof result === "string") return actionError(result);

  const whenLabel = formatDateTime(result.slot.startsAt, result.property.timezone);
  if (v.email) {
    await sendProspectConfirmation({
      email: v.email,
      name: v.fullName,
      propertyTitle: result.property.title,
      whenLabel,
      address: formatAddress(result.property.address) ?? "",
      cancelToken,
    });
  }
  await notifyWorkspaceParties({
    propertyId: result.property.id,
    workspaceId: ctx.workspace.id,
    assignedUserId: result.property.assignedUserId,
    propertyTitle: result.property.title,
    prospectName: v.fullName,
    whenLabel,
    kind: "booked",
  });
  await enqueueMaterialize(result.calendarId);
  revalidateViewings(result.property.id);
  await revalidatePublicPropertyPages(result.property.id);
  return actionOk({
    bookingId: result.bookingId,
    propertyId: result.property.id,
    propertyTitle: result.property.title,
    startsAt: result.slot.startsAt.toISOString(),
    whenLabel,
  });
}

async function loadBooking(tx: Tx, workspaceId: string, bookingId: string) {
  const [row] = await tx
    .select({
      booking: bookings,
      slot: viewingSlots,
      property: properties,
      contact: { id: contacts.id, fullName: contacts.fullName, email: contacts.email },
    })
    .from(bookings)
    .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .innerJoin(contacts, eq(contacts.id, bookings.contactId))
    .where(and(eq(bookings.id, bookingId), eq(properties.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

async function releaseBooking(
  tx: Tx,
  row: NonNullable<Awaited<ReturnType<typeof loadBooking>>>,
  reason: string | undefined,
) {
  await tx
    .update(bookings)
    .set({ status: "cancelled", cancelledBy: "agent", note: reason ?? row.booking.note })
    .where(eq(bookings.id, row.booking.id));
  await tx
    .update(viewingSlots)
    .set({ status: "open" })
    .where(and(eq(viewingSlots.id, row.slot.id), eq(viewingSlots.status, "booked")));
}

export async function cancelViewingCore(
  ctx: AppContext,
  input: unknown,
): Promise<ActionResult<StaffBookingResult>> {
  const denied = gate(ctx);
  if (denied) return denied;
  const parsed = cancelViewingSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const row = await withUserContext(ctx.user.id, async (tx) => {
    const found = await loadBooking(tx, ctx.workspace.id, parsed.data.bookingId);
    if (!found) return "not_found" as const;
    if (found.booking.status !== "confirmed") return "not_active" as const;
    await releaseBooking(tx, found, parsed.data.reason);
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: found.property.id,
        action: "booking.cancelled",
        entity: "booking",
        entityId: found.booking.id,
        data: { by: "staff", reason: parsed.data.reason ?? null },
      },
      tx,
    );
    return found;
  });
  if (typeof row === "string") return actionError(row);

  const whenLabel = formatDateTime(row.slot.startsAt, row.property.timezone);
  if (row.contact.email) {
    await sendProspectCancellation({
      email: row.contact.email,
      name: row.contact.fullName,
      propertyTitle: row.property.title,
      whenLabel,
    });
  }
  await notifyWorkspaceParties({
    propertyId: row.property.id,
    workspaceId: ctx.workspace.id,
    assignedUserId: row.property.assignedUserId,
    propertyTitle: row.property.title,
    prospectName: row.contact.fullName,
    whenLabel,
    kind: "cancelled",
  });
  await enqueueMaterialize(row.slot.viewingCalendarId);
  revalidateViewings(row.property.id);
  await revalidatePublicPropertyPages(row.property.id);
  return actionOk({
    bookingId: row.booking.id,
    propertyId: row.property.id,
    propertyTitle: row.property.title,
    startsAt: row.slot.startsAt.toISOString(),
    whenLabel,
  });
}

/** Cancel + rebook in one transaction, keeping the prospect. */
export async function rescheduleViewingCore(
  ctx: AppContext,
  input: unknown,
): Promise<ActionResult<StaffBookingResult & { previousWhenLabel: string }>> {
  const denied = gate(ctx);
  if (denied) return denied;
  const parsed = rescheduleViewingSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const cancelToken = secureToken();

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const found = await loadBooking(tx, ctx.workspace.id, parsed.data.bookingId);
    if (!found) return "not_found" as const;
    if (found.booking.status !== "confirmed") return "not_active" as const;
    const slot = await lockSlot(tx, found.slot.viewingCalendarId, parsed.data);
    if (!slot) return "slot_taken" as const;
    await releaseBooking(tx, found, undefined);
    const [booking] = await tx
      .insert(bookings)
      .values({
        viewingSlotId: slot.id,
        propertyId: found.property.id,
        contactId: found.contact.id,
        cancelToken,
        status: "confirmed",
        note: found.booking.note,
      })
      .returning({ id: bookings.id });
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: found.property.id,
        action: "booking.rescheduled",
        entity: "booking",
        entityId: booking!.id,
        data: { from: found.slot.id, to: slot.id, previousBookingId: found.booking.id },
      },
      tx,
    );
    return { found, slot, bookingId: booking!.id };
  });
  if (typeof result === "string") return actionError(result);

  const { found, slot } = result;
  const tz = found.property.timezone;
  const whenLabel = formatDateTime(slot.startsAt, tz);
  const previousWhenLabel = formatDateTime(found.slot.startsAt, tz);
  if (found.contact.email) {
    await sendProspectConfirmation({
      email: found.contact.email,
      name: found.contact.fullName,
      propertyTitle: found.property.title,
      whenLabel,
      address: formatAddress(found.property.address) ?? "",
      cancelToken,
    });
  }
  for (const kind of ["cancelled", "booked"] as const) {
    await notifyWorkspaceParties({
      propertyId: found.property.id,
      workspaceId: ctx.workspace.id,
      assignedUserId: found.property.assignedUserId,
      propertyTitle: found.property.title,
      prospectName: found.contact.fullName,
      whenLabel: kind === "booked" ? whenLabel : previousWhenLabel,
      kind,
    });
  }
  await enqueueMaterialize(found.slot.viewingCalendarId);
  revalidateViewings(found.property.id);
  await revalidatePublicPropertyPages(found.property.id);
  return actionOk({
    bookingId: result.bookingId,
    propertyId: found.property.id,
    propertyTitle: found.property.title,
    startsAt: slot.startsAt.toISOString(),
    whenLabel,
    previousWhenLabel,
  });
}
