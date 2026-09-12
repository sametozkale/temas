import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { TZDate } from "@date-fns/tz";
import { addMonths, startOfMonth } from "date-fns";

import { CalendarBoard } from "@/components/calendar/calendar-board";
import { EmptyState } from "@/components/empty-state";
import { EventChip } from "@/components/event-chip";
import { Calendar03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth";
import { parseYearMonth, type CalendarView } from "@/lib/calendar/grid";
import { withUserContext } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { listProperties } from "@/lib/properties/queries";
import {
  listBookingsInRange,
  listUpcomingBookings,
} from "@/lib/viewings/queries";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    month?: string;
    week?: string;
    property?: string;
  }>;
}) {
  const t = await getTranslations("calendar");
  const ctx = await getAppContext();
  const params = await searchParams;
  const view: CalendarView =
    params.view === "week" || params.view === "list" || params.view === "month"
      ? params.view
      : "month";
  const zoned = TZDate.tz(ctx.workspace.timezone);
  const parsed = parseYearMonth(
    params.month,
    new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()),
  );
  const propertyId = params.property || undefined;

  const { events, upcoming, properties } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const start = startOfMonth(
        new Date(Date.UTC(parsed.year, parsed.month - 1, 1)),
      );
      const end = addMonths(start, 1);
      const [events, upcoming, properties] = await Promise.all([
        listBookingsInRange(
          tx,
          ctx.workspace.id,
          new Date(start.getTime() - 7 * 24 * 60 * 60_000),
          new Date(end.getTime() + 7 * 24 * 60 * 60_000),
          propertyId,
        ),
        listUpcomingBookings(tx, ctx.workspace.id),
        listProperties(tx, ctx.workspace.id),
      ]);
      return { events, upcoming, properties };
    },
  );

  const filteredUpcoming = propertyId
    ? upcoming.filter((row) => row.propertyId === propertyId)
    : upcoming;

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <CalendarBoard
        view={view}
        year={parsed.year}
        month={parsed.month}
        week={params.week}
        timeZone={ctx.workspace.timezone}
        events={events}
        properties={properties.map((row) => ({ id: row.id, title: row.title }))}
        propertyId={propertyId}
      />
      {view === "list" || filteredUpcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">{t("upcoming")}</h2>
          {filteredUpcoming.length === 0 ? (
            <EmptyState
              icon={Calendar03Icon}
              title={t("empty_title")}
              description={t("empty_description")}
            />
          ) : (
            <div className="divide-y rounded-lg border px-4">
              {filteredUpcoming.map((row) => (
                <Link
                  key={row.id}
                  href={`/properties/${row.propertyId}/viewings`}
                  className="block"
                >
                  <EventChip
                    tone={row.status === "completed" ? "success" : "brand"}
                    time={formatDateTime(row.startsAt, row.timezone)
                      .split(", ")
                      .at(-1)}
                    title={row.propertyTitle}
                    meta={`${row.prospectName} · ${formatDateTime(row.startsAt, row.timezone)}`}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}
      {view !== "list" &&
      events.length === 0 &&
      filteredUpcoming.length === 0 ? (
        <EmptyState
          icon={Calendar03Icon}
          title={t("empty_title")}
          description={t("empty_description")}
        />
      ) : null}
    </div>
  );
}
