import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TZDate } from "@date-fns/tz";
import { addMonths, startOfMonth } from "date-fns";

import { CalendarBoard } from "@/components/calendar/calendar-board";
import { CalendarFilters } from "@/components/calendar/calendar-property-filter";
import { CalendarList } from "@/components/calendar/calendar-list";
import { GoogleCalendarMenu } from "@/components/calendar/google-calendar-menu";
import { GoogleEventColorProvider } from "@/components/calendar/google-event-color";
import { EmptyState } from "@/components/empty-state";
import { Calendar03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getAppContext } from "@/lib/auth";
import { loadGoogleOverlay } from "@/lib/calendar/google";
import {
  monthKey,
  monthKeyFromIso,
  parseYearMonth,
  timeLabelInZone,
  weekDays,
  type CalendarView,
} from "@/lib/calendar/grid";
import { withUserContext } from "@/lib/db";
import { listAssignableMembers } from "@/lib/properties/assignment";
import { can } from "@/lib/permissions";
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
  const now = new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate());
  const parsed = parseYearMonth(params.month, now);
  const propertyId = params.property || undefined;

  if (view === "week") {
    const weekAnchor =
      params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
        ? params.week
        : weekDays(undefined, ctx.workspace.timezone, now)[0]!;
    const weekMonth = monthKeyFromIso(weekAnchor);
    if (params.week !== weekAnchor || params.month !== weekMonth) {
      const q = new URLSearchParams();
      q.set("view", "week");
      q.set("month", weekMonth);
      q.set("week", weekAnchor);
      if (propertyId) q.set("property", propertyId);
      if (params.agent) q.set("agent", params.agent);
      redirect(`/calendar?${q.toString()}`);
    }
  }

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

  const rangeStart = startOfMonth(
    new Date(Date.UTC(parsed.year, parsed.month - 1, 1)),
  );
  const overlay = await loadGoogleOverlay(
    ctx.user.id,
    new Date(rangeStart.getTime() - 7 * 24 * 60 * 60_000),
    new Date(addMonths(rangeStart, 1).getTime() + 7 * 24 * 60 * 60_000),
    ctx.workspace.timezone,
    (value) => timeLabelInZone(value, ctx.workspace.timezone),
  ).catch(() => ({
    status: "off" as const,
    calendars: [],
    events: [],
    colors: [],
    labels: {},
    canColor: false,
  }));
  const personal =
    !propertyId && (!assignedUserId || assignedUserId === ctx.user.id);
  const googleEvents = personal ? overlay.events : [];
  const canConnect = can(ctx.membership.role, "integrations.manage");
  const showConnectEmpty = overlay.status !== "ready" && events.length === 0;

  const filteredUpcoming = propertyId
    ? upcoming.filter((row) => row.propertyId === propertyId)
    : upcoming;

  return (
    <GoogleEventColorProvider
      palette={overlay.canColor ? overlay.colors : []}
      labels={overlay.canColor ? overlay.labels : {}}
    >
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        className="shrink-0"
        title={t("title")}
        actions={
          <CalendarFilters
            properties={properties.map((row) => ({
              id: row.id,
              title: row.title,
            }))}
            propertyId={propertyId}
            agents={agents.map((a) => ({
              userId: a.userId,
              name: a.fullName ?? a.userId,
            }))}
            agentId={params.agent}
            currentUserId={ctx.user.id}
            view={view}
            month={monthKey(parsed.year, parsed.month)}
            week={params.week}
          />
        }
      />
      {showConnectEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            className="max-w-sm"
            icon={Calendar03Icon}
            title={t(
              overlay.status === "reconnect"
                ? "reconnect_empty_title"
                : "connect_empty_title",
            )}
            description={t(
              overlay.status === "reconnect"
                ? "reconnect_empty_description"
                : "connect_empty_description",
            )}
            action={
              canConnect ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={
                      overlay.status === "reconnect"
                        ? "/api/integrations/gmail/start"
                        : "/settings/integrations/gmail"
                    }
                  >
                    {t(
                      overlay.status === "reconnect"
                        ? "google_reconnect"
                        : "google_connect",
                    )}
                  </Link>
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
      <CalendarBoard
        view={view}
        year={parsed.year}
        month={parsed.month}
        week={params.week}
        timeZone={ctx.workspace.timezone}
        events={events}
        propertyId={propertyId}
        agentId={params.agent}
        googleEvents={googleEvents}
        googleMenu={
          <GoogleCalendarMenu
            status={overlay.status}
            calendars={overlay.calendars}
            canConnect={canConnect}
          />
        }
      />
      )}
      {view === "list" && !showConnectEmpty ? (
        <section className="min-h-0 flex-1 overflow-auto">
          {filteredUpcoming.length === 0 && googleEvents.length === 0 ? (
            <EmptyState
              icon={Calendar03Icon}
              title={t("empty_title")}
              description={t("empty_description")}
            />
          ) : (
            <CalendarList
              viewings={filteredUpcoming}
              googleEvents={googleEvents}
              timeZone={ctx.workspace.timezone}
            />
          )}
        </section>
      ) : null}
    </div>
    </GoogleEventColorProvider>
  );
}
