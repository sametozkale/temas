import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EventChip } from "@/components/event-chip";
import { Button } from "@/components/ui/button";
import {
  dayKeyInZone,
  monthGrid,
  monthKey,
  shiftMonth,
  timeLabelInZone,
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
};

export async function CalendarBoard({
  view,
  year,
  month,
  week,
  timeZone,
  events,
  properties,
  propertyId,
}: {
  view: CalendarView;
  year: number;
  month: number;
  week?: string;
  timeZone: string;
  events: CalendarEvent[];
  properties: { id: string; title: string }[];
  propertyId?: string;
}) {
  const t = await getTranslations("calendar");
  const key = monthKey(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
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
        {view !== "list" ? (
          <div className="flex items-center gap-2">
            <Button size="xs" variant="ghost" asChild>
              <Link href={href({ month: monthKey(prev.year, prev.month) })}>
                {t("prev")}
              </Link>
            </Button>
            <p className="text-sm font-medium">{key}</p>
            <Button size="xs" variant="ghost" asChild>
              <Link href={href({ month: monthKey(next.year, next.month) })}>
                {t("next")}
              </Link>
            </Button>
          </div>
        ) : null}
        <form className="flex items-center gap-2">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="month" value={key} />
          <label className="sr-only" htmlFor="calendar-property">
            {t("filter_property")}
          </label>
          <select
            id="calendar-property"
            name="property"
            defaultValue={propertyId ?? ""}
            className="h-8 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">{t("all_properties")}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
          <Button type="submit" size="xs" variant="outline">
            {t("apply_filter")}
          </Button>
        </form>
      </div>

      {view === "month" ? (
        <div className="overflow-x-auto rounded-lg border">
          <div className="grid min-w-[48rem] grid-cols-7 divide-x divide-y">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {weeks.flat().map((cell) => {
              const dayEvents = byDay.get(cell.date) ?? [];
              return (
                <div
                  key={cell.date}
                  className={cn(
                    "min-h-24 space-y-1 p-2",
                    !cell.inMonth && "bg-muted/20 text-muted-foreground",
                  )}
                >
                  <p className="text-xs tabular-nums">{cell.day}</p>
                  {dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/properties/${event.propertyId}/viewings`}
                      className="block"
                    >
                      <EventChip
                        tone={
                          event.status === "completed" ? "success" : "brand"
                        }
                        time={timeLabelInZone(event.startsAt, event.timezone)}
                        title={event.propertyTitle}
                        meta={event.prospectName}
                        className="py-1"
                      />
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDates.map((date, index) => (
            <div key={date} className="min-h-40 rounded-lg border p-2">
              <p className="text-xs font-medium">
                {weekdayLabels[index]} · {date.slice(8)}
              </p>
              {(byDay.get(date) ?? []).map((event) => (
                <Link
                  key={event.id}
                  href={`/properties/${event.propertyId}/viewings`}
                  className="block"
                >
                  <EventChip
                    tone={event.status === "completed" ? "success" : "brand"}
                    time={timeLabelInZone(event.startsAt, event.timezone)}
                    title={event.propertyTitle}
                    meta={event.prospectName}
                    className="py-1"
                  />
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
