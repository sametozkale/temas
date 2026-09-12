import { getTranslations } from "next-intl/server";

import { EventChip } from "@/components/event-chip";
import { CopyInviteButton } from "@/components/viewings/copy-invite-button";
import { ViewingsPanel } from "@/components/viewings/viewings-panel";
import { withUserContext } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { parseTimeToMinutes } from "@/lib/slots";
import { enqueueMaterialize } from "@/lib/viewings/enqueue";
import {
  getCalendarByProperty,
  listOpenSlots,
  listPropertyPeopleForCalendar,
  listWindows,
} from "@/lib/viewings/queries";
import {
  emptyWeek,
  weekdayFromRRule,
  type WeekCell,
} from "@/lib/viewings/week";

import { loadProperty } from "../../load";

function weekFromWindows(
  windows: {
    participantKind: string;
    rrule: string;
    startTime: string;
    endTime: string;
  }[],
): WeekCell[] {
  const week = emptyWeek();
  for (const w of windows) {
    if (w.participantKind !== "agent") continue;
    const day = weekdayFromRRule(w.rrule);
    if (!day) continue;
    const cell = week.find((c) => c.weekday === day);
    if (!cell) continue;
    cell.enabled = true;
    cell.startMin = parseTimeToMinutes(w.startTime);
    cell.endMin = parseTimeToMinutes(w.endTime);
  }
  return week;
}

export default async function ViewingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const t = await getTranslations("viewings");
  const canManage = can(ctx.membership.role, "calendar.manage");

  const { calendar, windows, slots, people } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const calendar = await getCalendarByProperty(tx, id);
      const people = await listPropertyPeopleForCalendar(tx, id);
      if (!calendar) {
        return { calendar: null, windows: [], slots: [], people };
      }
      const [windows, slots] = await Promise.all([
        listWindows(tx, calendar.id),
        listOpenSlots(tx, calendar.id, new Date()),
      ]);
      return { calendar, windows, slots, people };
    },
  );

  if (calendar) {
    try {
      await enqueueMaterialize(calendar.id);
    } catch (error) {
      console.error("materializeCalendar failed", error);
    }
  }

  const publicUrl = calendar
    ? new URL(`/b/${calendar.publicToken}`, env().APP_URL).toString()
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ViewingsPanel
        propertyId={id}
        calendar={
          calendar
            ? {
                id: calendar.id,
                slotDurationMin: calendar.slotDurationMin,
                bufferMin: calendar.bufferMin,
                minNoticeHours: calendar.minNoticeHours,
                maxDaysAhead: calendar.maxDaysAhead,
                isPublished: calendar.isPublished,
              }
            : null
        }
        week={weekFromWindows(windows)}
        publicUrl={publicUrl}
        canManage={canManage}
      />
      <div className="space-y-6">
        <section className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">{t("upcoming")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("upcoming_hint")}
            </p>
          </div>
          {slots.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("no_slots")}
            </p>
          ) : (
            <div className="divide-y px-2">
              {slots.slice(0, 12).map((s) => (
                <EventChip
                  key={s.id}
                  tone="brand"
                  time={formatDateTime(s.startsAt, property.timezone)
                    .split(", ")
                    .at(-1)}
                  title={formatDateTime(s.startsAt, property.timezone)}
                />
              ))}
            </div>
          )}
        </section>
        <section className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">{t("people_title")}</h2>
            <p className="text-xs text-muted-foreground">{t("people_hint")}</p>
          </div>
          {people.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("no_people")}
            </p>
          ) : (
            <ul className="divide-y">
              {people.map((p) => (
                <li key={p.id} className="px-4 py-3 text-sm">
                  <p className="font-medium">{p.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`relations.${p.relation}`)}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                  {p.inviteToken && canManage ? (
                    <div className="pt-1">
                      <CopyInviteButton token={p.inviteToken} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
