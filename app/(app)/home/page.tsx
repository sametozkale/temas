import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HomeAsk } from "@/components/home/home-ask";
import { EmptyState } from "@/components/empty-state";
import { EventChip } from "@/components/event-chip";
import { Calendar03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { listThreads } from "@/lib/ai/ask";
import { isTextConfigured } from "@/lib/ai/models";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { formatDateTime, formatRelative } from "@/lib/format";
import { listUpcomingBookings } from "@/lib/viewings/queries";

export default async function HomePage() {
  const t = await getTranslations("home");
  const ctx = await getAppContext();
  const configured = isTextConfigured();
  const { bookings, threads } = await withUserContext(
    ctx.user.id,
    async (tx) => ({
      bookings: await listUpcomingBookings(tx, ctx.workspace.id),
      threads: await listThreads(tx, ctx.workspace.id, ctx.user.id),
    }),
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          configured ? null : (
            <Badge variant="warning">{t("not_configured")}</Badge>
          )
        }
      />
      {bookings.length === 0 ? (
        <EmptyState
          icon={Calendar03Icon}
          title={t("empty_title")}
          description={t("empty_description")}
        />
      ) : (
        <div className="divide-y rounded-lg border px-4">
          {bookings.map((row) => (
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
      {threads.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">{t("threads_title")}</h2>
          <ul className="divide-y rounded-lg border">
            {threads.map((thread) => (
              <li key={thread.id} className="px-4 py-2.5">
                <p className="truncate text-sm font-medium">
                  {thread.title ?? t("untitled_thread")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelative(thread.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <HomeAsk suggestion={t("suggestion_viewings")} />
    </div>
  );
}
