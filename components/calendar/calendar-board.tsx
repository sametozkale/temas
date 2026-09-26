import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { TZDate } from "@date-fns/tz";

import { CalendarEventPill } from "@/components/calendar/event-pill";
import { GoogleEventPill } from "@/components/calendar/google-event-pill";
import { WeekTimeGrid } from "@/components/calendar/week-grid";
import { ArrowLeft01Icon, ArrowRight01Icon, Icon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  dayKeyInZone,
  minutesInZone,
  monthGrid,
  monthKey,
  monthKeyFromIso,
  shiftIsoDate,
  shiftMonth,
  timeLabelInZone,
  todayIsOnScreen,
  weekDays,
  type CalendarView,
} from "@/lib/calendar/grid";
import type { GoogleDayEvent } from "@/lib/calendar/google";
import { cn } from "@/lib/utils";

/** Monday-start grids: Saturday and Sunday are the last two columns. */
function weekendColumn(index: number) {
  return index % 7 >= 5;
}

export type CalendarEvent = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  propertyId: string;
  propertyTitle: string;
  prospectName: string;
  status: string;
  timezone: string;
  assignedAgentName?: string | null;
};

const MONTH_VISIBLE = 5;

export async function CalendarBoard({
  view,
  year,
  month,
  week,
  timeZone,
  events,
  propertyId,
  agentId,
  googleEvents = [],
  googleMenu,
}: {
  view: CalendarView;
  year: number;
  month: number;
  week?: string;
  timeZone: string;
  events: CalendarEvent[];
  propertyId?: string;
  agentId?: string;
  googleEvents?: GoogleDayEvent[];
  googleMenu?: ReactNode;
}) {
  const t = await getTranslations("calendar");
  const format = await getFormatter();
  const key = monthKey(year, month);
  const monthLabel = format.dateTime(new Date(year, month - 1, 15), {
    month: "long",
    year: "numeric",
  });
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const zonedNow = TZDate.tz(timeZone);
  const todayKey = dayKeyInZone(zonedNow, timeZone);
  const todayMonth = monthKey(zonedNow.getFullYear(), zonedNow.getMonth() + 1);

  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = dayKeyInZone(event.startsAt, event.timezone || timeZone);
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  }

  const href = (opts: {
    view?: CalendarView;
    month?: string;
    week?: string;
    property?: string | null;
    agent?: string | null;
  }) => {
    const params = new URLSearchParams();
    params.set("view", opts.view ?? view);
    if ((opts.view ?? view) !== "list") {
      params.set("month", opts.month ?? key);
    }
    if (opts.week) params.set("week", opts.week);
    const filter =
      opts.property === null ? undefined : (opts.property ?? propertyId);
    if (filter) params.set("property", filter);
    const agentFilter =
      opts.agent === null ? undefined : (opts.agent ?? agentId);
    if (agentFilter) params.set("agent", agentFilter);
    return `/calendar?${params.toString()}`;
  };

  const weeks = monthGrid(year, month, timeZone);
  const weekDates = weekDays(week, timeZone);
  const weekdayLabels = [
    t("weekday_mon"),
    t("weekday_tue"),
    t("weekday_wed"),
    t("weekday_thu"),
    t("weekday_fri"),
    t("weekday_sat"),
    t("weekday_sun"),
  ];
  const weekStart = weekDates[0] ?? todayKey;
  const weekEnd = weekDates[6] ?? todayKey;
  const visibleDates =
    view === "week" ? weekDates : weeks.flat().map((cell) => cell.date);
  const showToday = !todayIsOnScreen(view, todayKey, visibleDates);
  const rangeLabel =
    view === "week"
      ? `${format.dateTime(new Date(`${weekStart}T12:00:00`), {
          month: "short",
          day: "numeric",
        })} – ${format.dateTime(new Date(`${weekEnd}T12:00:00`), {
          month: "short",
          day: "numeric",
        })}`
      : monthLabel;

  const googleByDay = new Map<string, GoogleDayEvent[]>();
  for (const event of googleEvents) {
    const list = googleByDay.get(event.day) ?? [];
    list.push(event);
    googleByDay.set(event.day, list);
  }

  function dayItems(date: string) {
    const dayEvents = (byDay.get(date) ?? []).map((event) => ({
      kind: "viewing" as const,
      id: event.id,
      sort: event.startsAt.getTime(),
      event,
    }));
    const external = (googleByDay.get(date) ?? []).map((event) => ({
      kind: "google" as const,
      id: event.id,
      sort: event.sort || 0,
      event,
    }));
    return [
      ...external.filter((item) => item.event.time === ""),
      ...dayEvents,
      ...external.filter((item) => item.event.time !== ""),
    ].sort((a, b) => a.sort - b.sort);
  }

  function renderItem(
    item: ReturnType<typeof dayItems>[number],
    date: string,
    frame: "line" | "block",
  ) {
    const deferTime = date < todayKey;
    if (item.kind === "viewing") {
      return (
        <CalendarEventPill
          href={`/properties/${item.event.propertyId}/viewings`}
          time={timeLabelInZone(item.event.startsAt, item.event.timezone)}
          title={item.event.propertyTitle}
          hint={[item.event.prospectName, item.event.assignedAgentName]
            .filter(Boolean)
            .join(" · ")}
          status={item.event.status}
          propertyId={item.event.propertyId}
          block={frame === "block"}
          deferTime={deferTime}
        />
      );
    }
    return (
      <GoogleEventPill
        time={item.event.time}
        title={item.event.title}
        when={item.event.when}
        location={item.event.location}
        calendarName={item.event.calendarName}
        color={item.event.color}
        colorId={item.event.colorId}
        calendarId={item.event.calendarId}
        seriesKey={item.event.seriesKey}
        writable={item.event.writable}
        block={frame === "block"}
        deferTime={deferTime}
      />
    );
  }

  function pills(date: string, limit: number) {
    const merged = dayItems(date);
    const visible = merged.slice(0, limit);
    const hidden = merged.length - visible.length;
    return (
      <>
        {visible.map((item) => (
          <span key={item.id} className="contents">
            {renderItem(item, date, "line")}
          </span>
        ))}
        {hidden > 0 ? (
          <p className="px-1 text-[11px] text-muted-foreground">
            {t("more", { count: hidden })}
          </p>
        ) : null}
      </>
    );
  }

  function viewingSpan(event: CalendarEvent) {
    const zone = event.timezone || timeZone;
    const start = minutesInZone(event.startsAt, zone);
    const endDay = dayKeyInZone(event.endsAt, zone);
    const startDay = dayKeyInZone(event.startsAt, zone);
    if (endDay > startDay) return { start, end: 24 * 60 };
    const end = minutesInZone(event.endsAt, zone);
    if (end <= start) return { start, end: Math.min(24 * 60, start + 30) };
    return { start, end };
  }

  const scrollHour = weekDates.includes(todayKey)
    ? Math.max(0, zonedNow.getHours() - 1)
    : 8;

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-4", view !== "list" && "flex-1")}
    >
      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        {view !== "list" ? (
          <div className="flex items-center">
            <p className="text-sm font-medium whitespace-nowrap tabular-nums">
              {rangeLabel}
            </p>
            <div className="ml-0.5 flex items-center gap-0.5">
              {(() => {
                const prevWeek = shiftIsoDate(weekStart, -7);
                const nextWeek = shiftIsoDate(weekStart, 7);
                const prevHref =
                  view === "week"
                    ? href({
                        week: prevWeek,
                        month: monthKeyFromIso(prevWeek),
                      })
                    : href({ month: monthKey(prev.year, prev.month) });
                const nextHref =
                  view === "week"
                    ? href({
                        week: nextWeek,
                        month: monthKeyFromIso(nextWeek),
                      })
                    : href({ month: monthKey(next.year, next.month) });
                const navClass = cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "text-muted-foreground hover:text-foreground",
                );
                return (
                  <>
                    <Link
                      href={prevHref}
                      aria-label={t("prev")}
                      className={navClass}
                    >
                      <Icon icon={ArrowLeft01Icon} size={16} />
                    </Link>
                    <Link
                      href={nextHref}
                      aria-label={t("next")}
                      className={navClass}
                    >
                      <Icon icon={ArrowRight01Icon} size={16} />
                    </Link>
                  </>
                );
              })()}
            </div>
            {showToday ? (
              <Button size="xs" variant="ghost" className="ml-0.5" asChild>
                <Link
                  href={href({
                    month: todayMonth,
                    week: view === "week" ? todayKey : undefined,
                  })}
                >
                  {t("today")}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
          {googleMenu}
          <div className="flex h-7 items-center gap-0.5 rounded-full bg-muted p-0.5">
            {(["month", "week", "list"] as const).map((item) => {
              const active = view === item;
              return (
                <Link
                  key={item}
                  href={href({ view: item })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-full items-center rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-card text-foreground",
                  )}
                >
                  {t(`view_${item}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid shrink-0 grid-cols-7 border-b">
            {weekdayLabels.map((label, index) => (
              <div
                key={label}
                className={cn(
                  "px-1.5 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground",
                  weekendColumn(index) && "bg-muted/30",
                )}
              >
                {label}
              </div>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-7"
            style={{
              gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))`,
            }}
          >
            {weeks.flat().map((cell, index) => {
              const isToday = cell.date === todayKey;
              const weekend = weekendColumn(index);
              return (
                <div
                  key={cell.date}
                  className={cn(
                    "flex min-h-0 flex-col gap-0.5 overflow-hidden border-b p-1",
                    (index + 1) % 7 !== 0 && "border-r",
                    weekend ? "bg-muted/30" : !cell.inMonth && "bg-muted/15",
                  )}
                >
                  <p
                    className={cn(
                      "mb-0.5 flex size-6 items-center justify-center text-xs tabular-nums",
                      isToday &&
                        "rounded-full bg-foreground font-medium text-background",
                      !cell.inMonth && !isToday && "text-muted-foreground/50",
                    )}
                  >
                    {cell.day}
                  </p>
                  {pills(cell.date, MONTH_VISIBLE)}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <WeekTimeGrid
          scrollHour={scrollHour}
          days={weekDates.map((date, index) => {
            const items = dayItems(date);
            const allDay = items.filter(
              (item) => item.kind === "google" && item.event.time === "",
            );
            const timed = items.filter(
              (item) => !(item.kind === "google" && item.event.time === ""),
            );
            return {
              date,
              label: weekdayLabels[index] ?? "",
              dayNum: Number(date.slice(8)),
              isToday: date === todayKey,
              weekend: weekendColumn(index),
              allDay: allDay.map((item) => (
                <span key={item.id}>{renderItem(item, date, "line")}</span>
              )),
              timed: timed.map((item) => {
                const span =
                  item.kind === "viewing"
                    ? viewingSpan(item.event)
                    : {
                        start: item.event.startMin ?? 0,
                        end: item.event.endMin ?? (item.event.startMin ?? 0) + 60,
                      };
                return {
                  key: item.id,
                  start: span.start,
                  end: span.end,
                  node: renderItem(item, date, "block"),
                };
              }),
            };
          })}
        />
      ) : null}
    </div>
  );
}
