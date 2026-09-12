export type ReminderKind =
  | "viewing_followup"
  | "booking_soon"
  | "unanswered_message"
  | "stale_applicant"
  | "missing_deposit";

export type ReminderSignal = {
  kind: ReminderKind;
  entity: string;
  entityId: string;
  dueAt: Date;
  context: {
    propertyTitle?: string | null;
    contactName?: string | null;
    href: string;
  };
};

export type ReminderScanInput = {
  now: Date;
  bookings: {
    id: string;
    status: string;
    startsAt: Date;
    contactId: string;
    contactName: string | null;
    propertyId: string;
    propertyTitle: string;
  }[];
  messagesAfter: Record<string, Date | null>;
  conversations: {
    id: string;
    lastDirection: "in" | "out" | null;
    lastMessageAt: Date | null;
    contactName: string | null;
    propertyTitle: string | null;
  }[];
  applications: {
    id: string;
    propertyId: string;
    propertyTitle: string;
    contactName: string | null;
    stageChangedAt: Date;
    isTerminal: boolean;
  }[];
  properties: {
    id: string;
    title: string;
    status: string;
    depositAmount: string | null;
  }[];
  existing: { kind: ReminderKind; entityId: string }[];
};

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export function detectReminderSignals(
  input: ReminderScanInput,
): ReminderSignal[] {
  const seen = new Set(
    input.existing.map((row) => `${row.kind}:${row.entityId}`),
  );
  const signals: ReminderSignal[] = [];

  function push(signal: ReminderSignal) {
    const key = `${signal.kind}:${signal.entityId}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push(signal);
  }

  for (const booking of input.bookings) {
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      continue;
    }
    const until = booking.startsAt.getTime() - input.now.getTime();
    if (until > 30 * 60_000 && until <= 2.5 * HOUR) {
      push({
        kind: "booking_soon",
        entity: "booking",
        entityId: booking.id,
        dueAt: booking.startsAt,
        context: {
          propertyTitle: booking.propertyTitle,
          contactName: booking.contactName,
          href: `/properties/${booking.propertyId}/viewings`,
        },
      });
    }
    const since = input.now.getTime() - booking.startsAt.getTime();
    if (since >= DAY && since < 7 * DAY) {
      const lastWord = input.messagesAfter[booking.contactId];
      if (!lastWord || lastWord.getTime() < booking.startsAt.getTime()) {
        push({
          kind: "viewing_followup",
          entity: "booking",
          entityId: booking.id,
          dueAt: input.now,
          context: {
            propertyTitle: booking.propertyTitle,
            contactName: booking.contactName,
            href: `/properties/${booking.propertyId}/viewings`,
          },
        });
      }
    }
  }

  for (const conversation of input.conversations) {
    if (
      conversation.lastDirection !== "in" ||
      !conversation.lastMessageAt ||
      input.now.getTime() - conversation.lastMessageAt.getTime() < 7 * DAY
    ) {
      continue;
    }
    push({
      kind: "unanswered_message",
      entity: "conversation",
      entityId: conversation.id,
      dueAt: input.now,
      context: {
        propertyTitle: conversation.propertyTitle,
        contactName: conversation.contactName,
        href: `/inbox/${conversation.id}`,
      },
    });
  }

  for (const application of input.applications) {
    if (application.isTerminal) continue;
    if (input.now.getTime() - application.stageChangedAt.getTime() < 5 * DAY) {
      continue;
    }
    push({
      kind: "stale_applicant",
      entity: "application",
      entityId: application.id,
      dueAt: input.now,
      context: {
        propertyTitle: application.propertyTitle,
        contactName: application.contactName,
        href: `/properties/${application.propertyId}/applications`,
      },
    });
  }

  for (const property of input.properties) {
    if (property.status !== "rented") continue;
    if (property.depositAmount && Number(property.depositAmount) > 0) continue;
    push({
      kind: "missing_deposit",
      entity: "property",
      entityId: property.id,
      dueAt: input.now,
      context: {
        propertyTitle: property.title,
        href: `/properties/${property.id}/edit`,
      },
    });
  }

  return signals;
}
