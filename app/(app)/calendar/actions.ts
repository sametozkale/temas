"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getAppContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import {
  asGmailCredentials,
  persistGmailCredentials,
} from "@/lib/integrations/gmail/sync";
import {
  GoogleCalendarForbidden,
  canColorGoogleEvents,
  listCalendarLabels,
  listGoogleCalendars,
  listGoogleColors,
  patchGoogleEventColor,
} from "@/lib/integrations/google/calendar";
import { ForbiddenError, requireAbility } from "@/lib/permissions";

const idsSchema = z.array(z.string().trim().min(1).max(512)).max(40);

const colorSchema = z.object({
  calendarId: z.string().trim().min(1).max(512),
  eventId: z.string().trim().min(1).max(1024),
  colorId: z.string().trim().min(1).max(64),
});

export async function setGoogleEventColor(input: {
  calendarId: string;
  eventId: string;
  colorId: string;
}): Promise<ActionResult> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "calendar.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = colorSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, ctx.user.id),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return actionError("forbidden");

  const credentials = asGmailCredentials(row.credentials);
  if (!canColorGoogleEvents(credentials.scope)) return actionError("reconnect");

  try {
    const [calendars, colors, labels] = await Promise.all([
      listGoogleCalendars(credentials),
      listGoogleColors(credentials),
      listCalendarLabels(credentials, parsed.data.calendarId),
    ]);
    const calendar = calendars.find((item) => item.id === parsed.data.calendarId);
    const label = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      parsed.data.colorId,
    );
    const allowed = label
      ? labels.some((item) => item.id === parsed.data.colorId)
      : colors.has(parsed.data.colorId);
    if (!calendar?.writable || !allowed) {
      return actionError("invalid");
    }
    await patchGoogleEventColor(
      credentials,
      calendar.id,
      parsed.data.eventId,
      parsed.data.colorId,
    );
  } catch (error) {
    if (error instanceof GoogleCalendarForbidden) return actionError("reconnect");
    return actionError("failed");
  }

  revalidatePath("/calendar");
  return actionOk();
}

export async function setGoogleCalendars(ids: string[]): Promise<ActionResult> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "calendar.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return actionError("invalid");

  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, ctx.user.id),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!row) return actionError("forbidden");

  const credentials = asGmailCredentials(row.credentials);
  try {
    const calendars = await listGoogleCalendars(credentials);
    const allowed = new Set(calendars.map((calendar) => calendar.id));
    credentials.selectedCalendarIds = parsed.data.filter((id) =>
      allowed.has(id),
    );
  } catch (error) {
    if (error instanceof GoogleCalendarForbidden) return actionError("reconnect");
    return actionError("invalid");
  }

  await persistGmailCredentials(row.id, credentials);
  revalidatePath("/calendar");
  return actionOk();
}
