import { getTranslations } from "next-intl/server";

import { EventChip } from "@/components/event-chip";
import { CopyInviteButton } from "@/components/viewings/copy-invite-button";
import { ViewingsPanel } from "@/components/viewings/viewings-panel";
import { withUserContext } from "@/lib/db";
import { publicAppUrl } from "@/lib/app-url";
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
import { getFormByProperty } from "@/lib/pipeline/queries";
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
  const [{ ctx, property }, t] = await Promise.all([
    loadProperty(id),
    getTranslations("viewings"),
  ]);
  const canManage = can(ctx.membership.role, "calendar.manage");

  const { calendar, windows, slots, people, form } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const [calendar, people, form] = await Promise.all([
        getCalendarByProperty(tx, id),
        listPropertyPeopleForCalendar(tx, id),
        getFormByProperty(tx, id),
      ]);
      if (!calendar) {
        return { calendar: null, windows: [], slots: [], people, form };
      }
      const [windows, slots] = await Promise.all([
        listWindows(tx, calendar.id),
        listOpenSlots(tx, calendar.id, new Date()),
      ]);
      return { calendar, windows, slots, people, form };
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
    ? new URL(`/b/${calendar.publicToken}`, await publicAppUrl()).toString()
    : null;

  return (
    <div className="grid min-w-0 gap-6 @3xl:grid-cols-[minmax(0,1fr)_16rem]">
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
                requireFormFirst: calendar.requireFormFirst,
                formId: calendar.formId,
              }
            : null
        }
        week={weekFromWindows(windows)}
        publicUrl={publicUrl}
        canManage={canManage}
        form={
          form
            ? {
                id: form.id,
                title: form.title,
                isPublished: form.isPublished,
              }
            : null
        }
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
