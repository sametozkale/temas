import { and, eq } from "drizzle-orm";

import { BookingCancelledEmail } from "@/emails/booking-cancelled";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { ViewingNotificationEmail } from "@/emails/viewing-notification";
import { publicAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { contacts, propertyPeople } from "@/lib/db/schema";
import { sendEmail } from "@/lib/integrations/resend";
import { notifyWorkspaceStaff } from "@/lib/notifications/dispatch";

/** Tenant + staff alerts for a booked or cancelled viewing (docs/04 §4). */
export async function notifyWorkspaceParties(input: {
  propertyId: string;
  workspaceId: string;
  assignedUserId?: string | null;
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

  await notifyWorkspaceStaff({
    workspaceId: input.workspaceId,
    assignedUserId: input.assignedUserId,
    type: "viewings",
    email: (name) =>
      input.kind === "booked"
        ? {
            subject: `New viewing — ${input.propertyTitle}`,
            react: ViewingNotificationEmail({
              recipientName: name,
              propertyTitle: input.propertyTitle,
              prospectName: input.prospectName,
              whenLabel: input.whenLabel,
              role: "agent",
            }),
          }
        : {
            subject: `Viewing cancelled — ${input.propertyTitle}`,
            react: BookingCancelledEmail({
              recipientName: name,
              propertyTitle: input.propertyTitle,
              whenLabel: input.whenLabel,
            }),
          },
    whatsapp: () =>
      input.kind === "booked"
        ? `New viewing — ${input.propertyTitle}. ${input.prospectName} booked ${input.whenLabel}.`
        : `Viewing cancelled — ${input.propertyTitle} (${input.whenLabel}).`,
  });
}

/** Prospect confirmation with the .ics and self-cancel links. */
export async function sendProspectConfirmation(input: {
  email: string;
  name: string;
  propertyTitle: string;
  whenLabel: string;
  address: string;
  cancelToken: string;
}) {
  const origin = await publicAppUrl();
  await sendEmail({
    to: input.email,
    subject: `Viewing confirmed — ${input.propertyTitle}`,
    react: BookingConfirmationEmail({
      recipientName: input.name,
      propertyTitle: input.propertyTitle,
      whenLabel: input.whenLabel,
      address: input.address,
      icsUrl: new URL(`/b/c/${input.cancelToken}/event.ics`, origin).toString(),
      cancelUrl: new URL(`/b/c/${input.cancelToken}`, origin).toString(),
    }),
  });
}

export async function sendProspectCancellation(input: {
  email: string;
  name: string;
  propertyTitle: string;
  whenLabel: string;
}) {
  await sendEmail({
    to: input.email,
    subject: `Viewing cancelled — ${input.propertyTitle}`,
    react: BookingCancelledEmail({
      recipientName: input.name,
      propertyTitle: input.propertyTitle,
      whenLabel: input.whenLabel,
    }),
  });
}
