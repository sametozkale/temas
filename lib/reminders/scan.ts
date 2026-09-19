import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { ReminderDigestEmail } from "@/emails/reminder-digest";
import { ReminderEmail } from "@/emails/reminder";
import { logActivity } from "@/lib/activity";
import type { DbOrTx } from "@/lib/db";
import { db } from "@/lib/db";
import {
  applications,
  authUsers,
  bookings,
  contacts,
  conversations,
  messages,
  pipelineStages,
  profiles,
  properties,
  reminders,
  viewingSlots,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/integrations/resend";
import {
  deliverStaffNotification,
  notifyWorkspaceStaff,
} from "@/lib/notifications/dispatch";
import { reminderCopy } from "@/lib/reminders/copy";
import {
  detectReminderSignals,
  type ReminderKind,
} from "@/lib/reminders/signals";

export async function scanReminders(now = new Date()) {
  const workspacesRows = await db
    .select({ id: workspaces.id })
    .from(workspaces);
  let created = 0;
  let emailed = 0;
  for (const workspace of workspacesRows) {
    const result = await scanWorkspaceReminders(workspace.id, now);
    created += result.created;
    emailed += result.emailed;
  }
  return { created, emailed, workspaces: workspacesRows.length };
}

export async function scanWorkspaceReminders(
  workspaceId: string,
  now = new Date(),
) {
  const horizonStart = new Date(now.getTime() - 8 * 24 * 60 * 60_000);
  const horizonEnd = new Date(now.getTime() + 3 * 60 * 60_000);

  const bookingRows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: viewingSlots.startsAt,
      contactId: contacts.id,
      contactName: contacts.fullName,
      contactEmail: contacts.email,
      propertyId: properties.id,
      propertyTitle: properties.title,
      assignedUserId: properties.assignedUserId,
    })
    .from(bookings)
    .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .innerJoin(contacts, eq(contacts.id, bookings.contactId))
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        gte(viewingSlots.startsAt, horizonStart),
        lte(viewingSlots.startsAt, horizonEnd),
        inArray(bookings.status, ["confirmed", "completed"]),
      ),
    );

  const contactIds = [...new Set(bookingRows.map((row) => row.contactId))];
  const messagesAfter: Record<string, Date | null> = {};
  if (contactIds.length > 0) {
    const inbound = await db
      .select({
        contactId: conversations.contactId,
        sentAt: messages.sentAt,
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          eq(messages.direction, "in"),
          inArray(conversations.contactId, contactIds),
        ),
      )
      .orderBy(desc(messages.sentAt));
    for (const row of inbound) {
      if (!row.contactId || messagesAfter[row.contactId]) continue;
      messagesAfter[row.contactId] = row.sentAt;
    }
  }

  const conversationRows = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      lastMessageAt: conversations.lastMessageAt,
      contactName: contacts.fullName,
      propertyTitle: properties.title,
      lastDirection: sql<"in" | "out" | null>`(
        select ${messages.direction} from ${messages}
        where ${messages.conversationId} = ${conversations.id}
        order by ${messages.sentAt} desc nulls last, ${messages.createdAt} desc
        limit 1
      )`,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(properties, eq(properties.id, conversations.propertyId))
    .where(eq(conversations.workspaceId, workspaceId));

  const applicationRows = await db
    .select({
      id: applications.id,
      propertyId: properties.id,
      propertyTitle: properties.title,
      contactName: contacts.fullName,
      stageChangedAt: applications.updatedAt,
      isTerminal: pipelineStages.isTerminal,
    })
    .from(applications)
    .innerJoin(properties, eq(properties.id, applications.propertyId))
    .innerJoin(contacts, eq(contacts.id, applications.contactId))
    .leftJoin(pipelineStages, eq(pipelineStages.id, applications.stageId))
    .where(eq(properties.workspaceId, workspaceId));

  const propertyRows = await db
    .select({
      id: properties.id,
      title: properties.title,
      status: properties.status,
      depositAmount: properties.depositAmount,
    })
    .from(properties)
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        eq(properties.status, "rented"),
      ),
    );

  const existing = await db
    .select({
      kind: reminders.kind,
      entityId: reminders.entityId,
    })
    .from(reminders)
    .where(
      and(
        eq(reminders.workspaceId, workspaceId),
        isNull(reminders.deliveredAt),
      ),
    );

  const signals = detectReminderSignals({
    now,
    bookings: bookingRows,
    messagesAfter,
    conversations: conversationRows,
    applications: applicationRows.map((row) => ({
      ...row,
      isTerminal: Boolean(row.isTerminal),
    })),
    properties: propertyRows.map((row) => ({
      ...row,
      depositAmount: row.depositAmount,
    })),
    existing: existing
      .filter((row): row is { kind: ReminderKind; entityId: string } =>
        Boolean(row.kind && row.entityId),
      )
      .map((row) => ({ kind: row.kind, entityId: row.entityId })),
  });

  let created = 0;
  let emailed = 0;
  for (const signal of signals) {
    const message = await reminderCopy(signal);
    const [row] = await db
      .insert(reminders)
      .values({
        workspaceId,
        userId:
          signal.kind === "unanswered_message" ? (signal.userId ?? null) : null,
        entity: signal.entity,
        entityId: signal.entityId,
        kind: signal.kind,
        message,
        dueAt: signal.dueAt,
        source: signal.kind === "booking_soon" ? "system" : "ai",
      })
      .returning({ id: reminders.id });
    created += 1;
    await logActivity({
      workspaceId,
      action: "reminder.created",
      entity: "reminder",
      entityId: row!.id,
      data: { kind: signal.kind, href: signal.context.href },
    });

    if (signal.kind === "booking_soon") {
      const booking = bookingRows.find((b) => b.id === signal.entityId);
      if (booking?.contactEmail) {
        await sendEmail({
          to: booking.contactEmail,
          subject: `Reminder: viewing at ${booking.propertyTitle}`,
          react: ReminderEmail({
            recipientName: booking.contactName ?? booking.contactEmail,
            title: "Your viewing is coming up",
            whenLabel: booking.startsAt.toISOString(),
            propertyTitle: booking.propertyTitle,
          }),
        });
        emailed += 1;
      }
      const whenLabel = booking?.startsAt.toISOString() ?? "";
      const propertyTitle = booking?.propertyTitle ?? "viewing";
      await notifyWorkspaceStaff({
        workspaceId,
        assignedUserId: booking?.assignedUserId,
        type: "viewing_reminders",
        email: (name) => ({
          subject: `Reminder: ${propertyTitle} in 2 hours`,
          react: ReminderEmail({
            recipientName: name,
            title: "A viewing starts soon",
            whenLabel,
            propertyTitle: booking?.propertyTitle,
          }),
        }),
        whatsapp: () =>
          `Reminder: ${propertyTitle} starts soon (${whenLabel}).`,
      });
      emailed += 1;
    }
  }
  return { created, emailed };
}

export async function listOpenReminders(
  tx: DbOrTx,
  workspaceId: string,
  userId: string,
) {
  return tx
    .select({
      id: reminders.id,
      kind: reminders.kind,
      message: reminders.message,
      dueAt: reminders.dueAt,
      entity: reminders.entity,
      entityId: reminders.entityId,
    })
    .from(reminders)
    .where(
      and(
        eq(reminders.workspaceId, workspaceId),
        isNull(reminders.deliveredAt),
        or(
          sql`${reminders.kind} is distinct from 'unanswered_message'`,
          eq(reminders.userId, userId),
        ),
      ),
    )
    .orderBy(reminders.dueAt);
}

export async function dismissReminder(workspaceId: string, reminderId: string) {
  const [row] = await db
    .update(reminders)
    .set({ deliveredAt: new Date() })
    .where(
      and(eq(reminders.id, reminderId), eq(reminders.workspaceId, workspaceId)),
    )
    .returning({ id: reminders.id });
  return Boolean(row);
}

export async function sendReminderDigests(now = new Date()) {
  const members = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      email: authUsers.email,
      name: profiles.fullName,
      phone: profiles.phone,
      notificationPrefs: profiles.notificationPrefs,
      workspaceName: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .innerJoin(authUsers, eq(authUsers.id, workspaceMembers.userId))
    .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId));

  let sent = 0;
  for (const member of members) {
    if (!member.email && !member.phone) continue;
    const open = await listOpenReminders(db, member.workspaceId, member.userId);
    if (open.length === 0) continue;
    const items = open.map((row) => row.message);
    await deliverStaffNotification(member, "digest", {
      email: member.email
        ? {
            subject: `${open.length} items need attention in ${member.workspaceName}`,
            react: ReminderDigestEmail({
              recipientName: member.name ?? member.email,
              workspaceName: member.workspaceName,
              items,
            }),
          }
        : undefined,
      whatsapp: `${open.length} items need attention in ${member.workspaceName}:\n${items
        .slice(0, 8)
        .map((line) => `• ${line}`)
        .join("\n")}`,
    });
    sent += 1;
  }
  return { sent, at: now.toISOString() };
}
