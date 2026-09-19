import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { forms, ownerViews, viewingCalendars } from "@/lib/db/schema";

/** Drop ISR snapshots of public token pages after a write (docs/04 §4). */
export async function revalidatePublicBookingByCalendar(calendarId: string) {
  const [row] = await db
    .select({ token: viewingCalendars.publicToken })
    .from(viewingCalendars)
    .where(eq(viewingCalendars.id, calendarId))
    .limit(1);
  if (row?.token) revalidatePath(`/b/${row.token}`);
}

export async function revalidatePublicPropertyPages(propertyId: string) {
  const [calendar, form, owner] = await Promise.all([
    db
      .select({ token: viewingCalendars.publicToken })
      .from(viewingCalendars)
      .where(eq(viewingCalendars.propertyId, propertyId))
      .limit(1),
    db
      .select({ token: forms.publicToken })
      .from(forms)
      .where(eq(forms.propertyId, propertyId))
      .limit(1),
    db
      .select({ token: ownerViews.publicToken })
      .from(ownerViews)
      .where(eq(ownerViews.propertyId, propertyId))
      .limit(1),
  ]);
  const booking = calendar[0]?.token;
  const formToken = form[0]?.token;
  const ownerToken = owner[0]?.token;
  if (booking) revalidatePath(`/b/${booking}`);
  if (formToken) revalidatePath(`/f/${formToken}`);
  if (ownerToken) revalidatePath(`/o/${ownerToken}`);
}
