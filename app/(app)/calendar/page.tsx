import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { EventChip } from "@/components/event-chip";
import { Calendar03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { listUpcomingBookings } from "@/lib/viewings/queries";

export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  const ctx = await getAppContext();
  const rows = await withUserContext(ctx.user.id, (tx) =>
    listUpcomingBookings(tx, ctx.workspace.id),
  );

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      {rows.length === 0 ? (
        <EmptyState
          icon={Calendar03Icon}
          title={t("empty_title")}
          description={t("empty_description")}
        />
      ) : (
        <div className="divide-y rounded-lg border px-4">
          {rows.map((row) => (
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
    </div>
  );
}
