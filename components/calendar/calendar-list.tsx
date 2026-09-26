import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { TZDate } from "@date-fns/tz";

import { GoogleEventListRow } from "@/components/calendar/google-event-color";
import { EventChip } from "@/components/event-chip";
import { dayKeyInZone } from "@/lib/calendar/grid";
import type { GoogleDayEvent } from "@/lib/calendar/google";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CalendarListViewing = {
  id: string;
  status: string;
  startsAt: Date;
  propertyId: string;
  propertyTitle: string;
  timezone: string;
  prospectName: string;
  assignedAgentName: string | null;
};

type ListItem =
  | { kind: "viewing"; sort: number; viewing: CalendarListViewing }
  | { kind: "google"; sort: number; event: GoogleDayEvent };

function noon(day: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new TZDate(year, month - 1, date, 12, 0, 0, 0, timeZone);
}

function isWeekend(day: string, timeZone: string) {
  const weekday = noon(day, timeZone).getDay();
  return weekday === 0 || weekday === 6;
}

export async function CalendarList({
  viewings,
  googleEvents,
  timeZone,
}: {
  viewings: CalendarListViewing[];
  googleEvents: GoogleDayEvent[];
  timeZone: string;
}) {
  const t = await getTranslations("calendar");
  const format = await getFormatter();
  const today = dayKeyInZone(new Date(), timeZone);

  const byDay = new Map<string, ListItem[]>();
  for (const viewing of viewings) {
    const day = dayKeyInZone(viewing.startsAt, viewing.timezone || timeZone);
    const list = byDay.get(day) ?? [];
    list.push({ kind: "viewing", sort: viewing.startsAt.getTime(), viewing });
    byDay.set(day, list);
  }
  for (const event of googleEvents) {
    const list = byDay.get(event.day) ?? [];
    list.push({ kind: "google", sort: event.sort || 0, event });
    byDay.set(event.day, list);
  }

  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col">
      {days.map(([day, items], index) => {
        const date = noon(day, timeZone);
        const previous = index > 0 ? days[index - 1]?.[0] : undefined;
        const showMonth = !previous || previous.slice(0, 7) !== day.slice(0, 7);
        const weekend = isWeekend(day, timeZone);
        const isToday = day === today;
        items.sort((a, b) => a.sort - b.sort);
        return (
          <section
            key={day}
            className={cn(
              "grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 py-2",
              index > 0 && "border-t border-foreground/6",
            )}
          >
            <div
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-2",
                weekend && "bg-muted/30",
              )}
            >
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
                {format.dateTime(date, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center text-xs tabular-nums",
                  isToday &&
                    "rounded-full bg-foreground font-medium text-background",
                )}
              >
                {date.getDate()}
              </span>
              {showMonth ? (
                <span className="text-[11px] text-muted-foreground">
                  {format.dateTime(date, { month: "short" })}
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              {items.map((item) =>
                item.kind === "viewing" ? (
                  <Link
                    key={item.viewing.id}
                    href={`/properties/${item.viewing.propertyId}/viewings`}
                    className="block rounded-lg"
                  >
                    <EventChip
                      comfortable
                      tone={
                        item.viewing.status === "completed" ? "success" : "brand"
                      }
                      time={formatDateTime(
                        item.viewing.startsAt,
                        item.viewing.timezone,
                      )
                        .split(", ")
                        .at(-1)}
                      title={item.viewing.propertyTitle}
                      meta={`${item.viewing.prospectName}${item.viewing.assignedAgentName ? ` · ${item.viewing.assignedAgentName}` : ""} · ${formatDateTime(item.viewing.startsAt, item.viewing.timezone)}`}
                    />
                  </Link>
                ) : (
                  <GoogleEventListRow
                    key={item.event.id}
                    event={item.event}
                    timeLabel={item.event.time || t("google_all_day")}
                  />
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
