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
import { listAssignableMembers } from "@/lib/properties/assignment";
import { listProperties } from "@/lib/properties/queries";
import { uuidSchema } from "@/lib/properties/schema";
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
    agent?: string;
  }>;
}) {
  const [t, ctx, params] = await Promise.all([
    getTranslations("calendar"),
    getAppContext(),
    searchParams,
  ]);
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
  const agentParam = params.agent;
  const assignedUserId =
    agentParam === "me"
      ? ctx.user.id
      : agentParam && uuidSchema.safeParse(agentParam).success
        ? agentParam
        : undefined;

  const { events, upcoming, properties, agents } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const start = startOfMonth(
        new Date(Date.UTC(parsed.year, parsed.month - 1, 1)),
      );
      const end = addMonths(start, 1);
      const [events, upcoming, properties, agents] = await Promise.all([
        listBookingsInRange(
          tx,
          ctx.workspace.id,
          new Date(start.getTime() - 7 * 24 * 60 * 60_000),
          new Date(end.getTime() + 7 * 24 * 60 * 60_000),
          { propertyId, assignedUserId },
        ),
        listUpcomingBookings(tx, ctx.workspace.id, assignedUserId),
        listProperties(tx, ctx.workspace.id),
        listAssignableMembers(tx, ctx.workspace.id),
      ]);
      return { events, upcoming, properties, agents };
    },
  );

  const filteredUpcoming = propertyId
    ? upcoming.filter((row) => row.propertyId === propertyId)
    : upcoming;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader className="shrink-0" title={t("title")} />
      <CalendarBoard
        view={view}
        year={parsed.year}
        month={parsed.month}
        week={params.week}
        timeZone={ctx.workspace.timezone}
        events={events}
        properties={properties.map((row) => ({ id: row.id, title: row.title }))}
        propertyId={propertyId}
        agents={agents.map((a) => ({
          userId: a.userId,
          name: a.fullName ?? a.userId,
        }))}
        agentId={params.agent}
        currentUserId={ctx.user.id}
      />
      {view === "list" ? (
        <section className="min-h-0 flex-1 overflow-auto">
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
                    meta={`${row.prospectName}${row.assignedAgentName ? ` · ${row.assignedAgentName}` : ""} · ${formatDateTime(row.startsAt, row.timezone)}`}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
