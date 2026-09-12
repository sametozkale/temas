"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { bookings, contacts, emailOtps, viewingSlots } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatAddress, formatDateTime } from "@/lib/format";
import { sendEmail } from "@/lib/integrations/resend";
import { consumeRateLimit } from "@/lib/rate-limit";
import { secureToken } from "@/lib/slug";
import { enqueueMaterialize } from "@/lib/viewings/enqueue";
import {
  getCalendarByPublicToken,
  getBookingByCancelToken,
  listWorkspaceStaff,
} from "@/lib/viewings/queries";
import { bookingProspectSchema, otpSchema } from "@/lib/viewings/schema";
import { BookingCancelledEmail } from "@/emails/booking-cancelled";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { BookingOtpEmail } from "@/emails/booking-otp";
import { ViewingNotificationEmail } from "@/emails/viewing-notification";
import { propertyPeople } from "@/lib/db/schema/properties";

function hashOtp(email: string, code: string) {
  return createHash("sha256").update(`havn-otp:${email}:${code}`).digest("hex");
}

async function notifyWorkspaceParties(input: {
  propertyId: string;
  workspaceId: string;
  propertyTitle: string;
  prospectName: string;
  whenLabel: string;
  kind: "booked" | "cancelled";
}) {
  const tenantRows = await db
    .select({ email: contacts.email, name: contacts.fullName })
    .from(propertyPeople)
    .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
    .where(
      and(
        eq(propertyPeople.propertyId, input.propertyId),
        eq(propertyPeople.relation, "current_tenant"),
      ),
    );

  for (const person of tenantRows) {
    if (!person.email) continue;
    if (input.kind === "booked") {
      await sendEmail({
        to: person.email,
        subject: `Viewing scheduled — ${input.propertyTitle}`,
        react: ViewingNotificationEmail({
          recipientName: person.name,
          propertyTitle: input.propertyTitle,
          prospectName: input.prospectName,
          whenLabel: input.whenLabel,
          role: "tenant",
        }),
      });
    } else {
      await sendEmail({
        to: person.email,
        subject: `Viewing cancelled — ${input.propertyTitle}`,
        react: BookingCancelledEmail({
          recipientName: person.name,
          propertyTitle: input.propertyTitle,
          whenLabel: input.whenLabel,
        }),
      });
    }
  }

  const staff = await listWorkspaceStaff(db, input.workspaceId);
  for (const member of staff) {
    if (!member.email) continue;
    if (input.kind === "booked") {
      await sendEmail({
        to: member.email,
        subject: `New viewing — ${input.propertyTitle}`,
        react: ViewingNotificationEmail({
          recipientName: member.name || member.email,
          propertyTitle: input.propertyTitle,
          prospectName: input.prospectName,
          whenLabel: input.whenLabel,
          role: "agent",
        }),
      });
    } else {
      await sendEmail({
        to: member.email,
        subject: `Viewing cancelled — ${input.propertyTitle}`,
        react: BookingCancelledEmail({
          recipientName: member.name || member.email,
          propertyTitle: input.propertyTitle,
          whenLabel: input.whenLabel,
        }),
      });
    }
  }
}

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

export async function requestBookingOtp(
  token: string,
  input: unknown,
): Promise<ActionResult<{ otpId: string }>> {
  const parsed = bookingProspectSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const ip = await clientIp();
  const otpLimit = await consumeRateLimit(`otp:${ip}`, 10, 60 * 60 * 1000);
  if (!otpLimit.ok) return actionError("rate_limited");

  const found = await getCalendarByPublicToken(db, token);
  if (!found || !found.calendar.isPublished) return actionError("not_found");

  const [slot] = await db
    .select()
    .from(viewingSlots)
    .where(
      and(
        eq(viewingSlots.id, parsed.data.slotId),
        eq(viewingSlots.viewingCalendarId, found.calendar.id),
        eq(viewingSlots.status, "open"),
      ),
    )
    .limit(1);
  if (!slot) return actionError("slot_taken");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const [otp] = await db
    .insert(emailOtps)
    .values({
      purpose: "booking",
      email: parsed.data.email,
      codeHash: hashOtp(parsed.data.email, code),
      payload: {
        token,
        slotId: slot.id,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        propertyId: found.property.id,
      },
      expiresAt: new Date(Date.now() + 10 * 60_000),
      ip,
    })
    .returning({ id: emailOtps.id });

  await sendEmail({
    to: parsed.data.email,
    subject: `Your viewing code for ${found.property.title}`,
    react: BookingOtpEmail({
      code,
      propertyTitle: found.property.title,
    }),
  });

  return actionOk({ otpId: otp!.id });
}

export async function confirmBookingOtp(
  input: unknown,
): Promise<ActionResult<{ cancelToken: string }>> {
  const parsed = otpSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const [otp] = await db
    .select()
    .from(emailOtps)
    .where(eq(emailOtps.id, parsed.data.otpId))
    .limit(1);
  if (!otp || otp.consumedAt || otp.expiresAt < new Date()) {
    return actionError("otp_expired");
  }

  const expected = Buffer.from(otp.codeHash);
  const actual = Buffer.from(hashOtp(otp.email, parsed.data.code));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await db
      .update(emailOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(emailOtps.id, otp.id));
    return actionError("otp_invalid");
  }

  const payload = otp.payload as {
    token: string;
    slotId: string;
    fullName: string;
    phone: string | null;
    propertyId: string;
  };

  const found = await getCalendarByPublicToken(db, payload.token);
  if (!found) return actionError("not_found");

  const dayLimit = await consumeRateLimit(
    `book:${payload.token}`,
    5,
    24 * 60 * 60 * 1000,
  );
  if (!dayLimit.ok) return actionError("rate_limited");

  const cancelToken = secureToken();

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx
      .update(viewingSlots)
      .set({ status: "booked" })
      .where(
        and(
          eq(viewingSlots.id, payload.slotId),
          eq(viewingSlots.status, "open"),
        ),
      )
      .returning();
    if (!locked) return null;

    const [existingContact] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, found.property.workspaceId),
          eq(contacts.email, otp.email),
        ),
      )
      .limit(1);

    const contactId =
      existingContact?.id ??
      (
        await tx
          .insert(contacts)
          .values({
            workspaceId: found.property.workspaceId,
            fullName: payload.fullName,
            email: otp.email,
            phone: payload.phone,
            emailVerified: true,
          })
          .returning({ id: contacts.id })
      )[0]!.id;

    if (existingContact) {
      await tx
        .update(contacts)
        .set({ emailVerified: true, fullName: payload.fullName })
        .where(eq(contacts.id, contactId));
    }

    await tx.insert(bookings).values({
      viewingSlotId: locked.id,
      propertyId: found.property.id,
      contactId,
      cancelToken,
      status: "confirmed",
    });

    await tx
      .update(emailOtps)
      .set({ consumedAt: new Date() })
      .where(eq(emailOtps.id, otp.id));

    await logActivity(
      {
        workspaceId: found.property.workspaceId,
        propertyId: found.property.id,
        action: "booking.created",
        entity: "booking",
        data: { slotId: locked.id, email: otp.email },
      },
      tx,
    );

    return locked;
  });

  if (!result) return actionError("slot_taken");

  const whenLabel = formatDateTime(result.startsAt, found.property.timezone);
  const address = formatAddress(found.property.address);
  const cancelUrl = new URL(`/b/c/${cancelToken}`, env().APP_URL).toString();
  const icsUrl = new URL(
    `/b/c/${cancelToken}/event.ics`,
    env().APP_URL,
  ).toString();

  await sendEmail({
    to: otp.email,
    subject: `Viewing confirmed — ${found.property.title}`,
    react: BookingConfirmationEmail({
      recipientName: payload.fullName,
      propertyTitle: found.property.title,
      whenLabel,
      address,
      icsUrl,
      cancelUrl,
    }),
  });

  await notifyWorkspaceParties({
    propertyId: found.property.id,
    workspaceId: found.property.workspaceId,
    propertyTitle: found.property.title,
    prospectName: payload.fullName,
    whenLabel,
    kind: "booked",
  });

  await enqueueMaterialize(found.calendar.id);
  revalidatePath(`/b/${payload.token}`);
  revalidatePath("/calendar");
  return actionOk({ cancelToken });
}

export async function cancelBookingByToken(
  cancelToken: string,
): Promise<ActionResult> {
  const row = await getBookingByCancelToken(db, cancelToken);
  if (!row) return actionError("not_found");
  if (row.booking.status === "cancelled") return actionOk();

  await db
    .update(bookings)
    .set({ status: "cancelled", cancelledBy: "prospect" })
    .where(eq(bookings.id, row.booking.id));
  await db
    .update(viewingSlots)
    .set({ status: "open" })
    .where(
      and(eq(viewingSlots.id, row.slot.id), eq(viewingSlots.status, "booked")),
    );

  await logActivity({
    workspaceId: row.property.workspaceId,
    propertyId: row.property.id,
    action: "booking.cancelled",
    entity: "booking",
    entityId: row.booking.id,
  });

  const whenLabel = formatDateTime(row.slot.startsAt, row.property.timezone);
  if (row.contact.email) {
    await sendEmail({
      to: row.contact.email,
      subject: `Viewing cancelled — ${row.property.title}`,
      react: BookingCancelledEmail({
        recipientName: row.contact.fullName,
        propertyTitle: row.property.title,
        whenLabel,
      }),
    });
  }

  await notifyWorkspaceParties({
    propertyId: row.property.id,
    workspaceId: row.property.workspaceId,
    propertyTitle: row.property.title,
    prospectName: row.contact.fullName,
    whenLabel,
    kind: "cancelled",
  });

  await enqueueMaterialize(row.calendarId);
  revalidatePath("/calendar");
  return actionOk();
}
