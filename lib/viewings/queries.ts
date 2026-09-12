import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import {
  authUsers,
  availabilityWindows,
  bookings,
  contacts,
  profiles,
  properties,
  propertyPeople,
  viewingCalendars,
  viewingSlots,
  workspaceMembers,
} from "@/lib/db/schema";

export async function getCalendarByProperty(tx: DbOrTx, propertyId: string) {
  const [row] = await tx
    .select()
    .from(viewingCalendars)
    .where(eq(viewingCalendars.propertyId, propertyId))
    .limit(1);
  return row ?? null;
}

export async function getCalendarByPublicToken(tx: DbOrTx, token: string) {
  const [row] = await tx
    .select({
      calendar: viewingCalendars,
      property: properties,
    })
    .from(viewingCalendars)
    .innerJoin(properties, eq(properties.id, viewingCalendars.propertyId))
    .where(eq(viewingCalendars.publicToken, token))
    .limit(1);
  return row ?? null;
}

export async function listWindows(tx: DbOrTx, calendarId: string) {
  return tx
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.viewingCalendarId, calendarId));
}

export async function listOpenSlots(
  tx: DbOrTx,
  calendarId: string,
  from: Date,
) {
  return tx
    .select()
    .from(viewingSlots)
    .where(
      and(
        eq(viewingSlots.viewingCalendarId, calendarId),
        eq(viewingSlots.status, "open"),
        gte(viewingSlots.startsAt, from),
      ),
    )
    .orderBy(asc(viewingSlots.startsAt));
}

export async function listBookingsInRange(
  tx: DbOrTx,
  workspaceId: string,
  from: Date,
  to: Date,
  propertyId?: string,
) {
  const where = [
    eq(properties.workspaceId, workspaceId),
    inArray(bookings.status, ["confirmed", "completed"]),
    gte(viewingSlots.startsAt, from),
    lte(viewingSlots.startsAt, to),
  ];
  if (propertyId) where.push(eq(properties.id, propertyId));
  return tx
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: viewingSlots.startsAt,
      endsAt: viewingSlots.endsAt,
      propertyId: properties.id,
      propertyTitle: properties.title,
      timezone: properties.timezone,
      prospectName: contacts.fullName,
    })
    .from(bookings)
    .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .innerJoin(contacts, eq(contacts.id, bookings.contactId))
    .where(and(...where))
    .orderBy(asc(viewingSlots.startsAt));
}

export async function listUpcomingBookings(tx: DbOrTx, workspaceId: string) {
  return tx
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: viewingSlots.startsAt,
      endsAt: viewingSlots.endsAt,
      propertyId: properties.id,
      propertyTitle: properties.title,
      timezone: properties.timezone,
      prospectName: contacts.fullName,
      prospectEmail: contacts.email,
    })
    .from(bookings)
    .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .innerJoin(contacts, eq(contacts.id, bookings.contactId))
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        inArray(bookings.status, ["confirmed", "completed"]),
        gte(viewingSlots.startsAt, new Date(Date.now() - 60 * 60_000)),
      ),
    )
    .orderBy(asc(viewingSlots.startsAt));
}

export async function getInviteByToken(tx: DbOrTx, token: string) {
  const [row] = await tx
    .select({
      person: propertyPeople,
      contact: contacts,
      property: properties,
    })
    .from(propertyPeople)
    .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
    .innerJoin(properties, eq(properties.id, propertyPeople.propertyId))
    .where(eq(propertyPeople.inviteToken, token))
    .limit(1);
  if (!row) return null;
  if (
    row.person.inviteExpiresAt &&
    row.person.inviteExpiresAt.getTime() < Date.now()
  ) {
    return null;
  }
  return row;
}

export async function listWorkspaceStaff(tx: DbOrTx, workspaceId: string) {
  return tx
    .select({
      email: authUsers.email,
      name: profiles.fullName,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(authUsers, eq(authUsers.id, workspaceMembers.userId))
    .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

export async function getBookingByCancelToken(tx: DbOrTx, cancelToken: string) {
  const [row] = await tx
    .select({
      booking: bookings,
      slot: viewingSlots,
      property: properties,
      contact: contacts,
      token: viewingCalendars.publicToken,
      calendarId: viewingCalendars.id,
    })
    .from(bookings)
    .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .innerJoin(contacts, eq(contacts.id, bookings.contactId))
    .innerJoin(
      viewingCalendars,
      eq(viewingCalendars.id, viewingSlots.viewingCalendarId),
    )
    .where(eq(bookings.cancelToken, cancelToken))
    .limit(1);
  return row ?? null;
}

export async function listPropertyPeopleForCalendar(
  tx: DbOrTx,
  propertyId: string,
) {
  return tx
    .select({
      id: propertyPeople.id,
      relation: propertyPeople.relation,
      inviteToken: propertyPeople.inviteToken,
      inviteExpiresAt: propertyPeople.inviteExpiresAt,
      joinedAt: propertyPeople.joinedAt,
      fullName: contacts.fullName,
      email: contacts.email,
      contactId: contacts.id,
    })
    .from(propertyPeople)
    .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
    .where(eq(propertyPeople.propertyId, propertyId));
}
