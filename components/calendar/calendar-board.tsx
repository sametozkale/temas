import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { TZDate } from "@date-fns/tz";

import { CalendarFilters } from "@/components/calendar/calendar-property-filter";
import { CalendarEventPill } from "@/components/calendar/event-pill";
import { ArrowLeft01Icon, ArrowRight01Icon, Icon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  dayKeyInZone,
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
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  startsAt: Date;
  propertyId: string;
  propertyTitle: string;
  prospectName: string;
  status: string;
  timezone: string;
  assignedAgentName?: string | null;
};

const MONTH_VISIBLE = 5;
const WEEK_VISIBLE = 12;

export async function CalendarBoard({
  view,
  year,
  month,
  week,
  timeZone,
  events,
  properties,
  propertyId,
  agents = [],
  agentId,
  currentUserId,
}: {
  view: CalendarView;
  year: number;
  month: number;
  week?: string;
  timeZone: string;
  events: CalendarEvent[];
  properties: { id: string; title: string }[];
  propertyId?: string;
  agents?: { userId: string; name: string }[];
  agentId?: string;
  currentUserId?: string;
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

  function pills(date: string, limit: number) {
    const dayEvents = byDay.get(date) ?? [];
    const visible = dayEvents.slice(0, limit);
    const hidden = dayEvents.length - visible.length;
    return (
      <>
        {visible.map((event) => (
          <CalendarEventPill
            key={event.id}
            href={`/properties/${event.propertyId}/viewings`}
            time={timeLabelInZone(event.startsAt, event.timezone)}
            title={event.propertyTitle}
            hint={[event.prospectName, event.assignedAgentName]
              .filter(Boolean)
              .join(" · ")}
            status={event.status}
            propertyId={event.propertyId}
          />
        ))}
        {hidden > 0 ? (
          <p className="px-1 text-[11px] text-muted-foreground">
            {t("more", { count: hidden })}
          </p>
        ) : null}
      </>
    );
  }

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
          <CalendarFilters
            properties={properties}
            propertyId={propertyId}
            agents={agents}
            agentId={agentId}
            currentUserId={currentUserId}
            view={view}
            month={key}
            week={week}
          />
          <div className="flex gap-1">
            {(["month", "week", "list"] as const).map((item) => (
              <Button
                key={item}
                size="xs"
                variant={view === item ? "secondary" : "ghost"}
                asChild
              >
                <Link href={href({ view: item })}>{t(`view_${item}`)}</Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid shrink-0 grid-cols-7 border-b">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="px-1.5 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground"
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
              return (
                <div
                  key={cell.date}
                  className={cn(
                    "flex min-h-0 flex-col gap-0.5 overflow-hidden border-b p-1",
                    (index + 1) % 7 !== 0 && "border-r",
                    !cell.inMonth && "bg-muted/15",
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
        <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden border-t">
          {weekDates.map((date, index) => {
            const isToday = date === todayKey;
            const dayNum = Number(date.slice(8));
            return (
              <div
                key={date}
                className={cn(
                  "flex min-h-0 flex-col gap-0.5 overflow-hidden border-b p-1",
                  index < 6 && "border-r",
                )}
              >
                <div className="mb-1 flex items-center gap-1.5 px-0.5">
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    {weekdayLabels[index]}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center text-xs tabular-nums",
                      isToday &&
                        "rounded-full bg-foreground font-medium text-background",
                    )}
                  >
                    {dayNum}
                  </span>
                </div>
                {pills(date, WEEK_VISIBLE)}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
