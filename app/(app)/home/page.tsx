import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HomeAsk } from "@/components/home/home-ask";
import { HomeRow, HomeSection } from "@/components/home/home-list";
import { NeedsAttention } from "@/components/home/needs-attention";
import { getThread } from "@/lib/ai/ask";
import { listAskEntities } from "@/lib/ai/entities";
import { isTextConfigured } from "@/lib/ai/models";
import { firstNameOf, getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { uuidSchema } from "@/lib/properties/schema";
import { listUpcomingBookings } from "@/lib/viewings/queries";
import { listOpenReminders } from "@/lib/reminders/scan";

const HOME_PREVIEW = 5;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; mine?: string }>;
}) {
  const [t, ctx, params] = await Promise.all([
    getTranslations("home"),
    getAppContext(),
    searchParams,
  ]);
  const configured = isTextConfigured();
  const threadId = uuidSchema.safeParse(params.thread).success
    ? params.thread
    : undefined;
  const mine = params.mine === "1";
  const firstName = firstNameOf(ctx.profile.fullName);
  const greeting = firstName
    ? t("greeting", { name: firstName })
    : t("greeting_anonymous");

  const { bookings, reminders, openThread, entities } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const [bookings, reminders, openThread, entities] = await Promise.all([
        listUpcomingBookings(
          tx,
          ctx.workspace.id,
          mine ? ctx.user.id : undefined,
        ),
        listOpenReminders(tx, ctx.workspace.id, ctx.user.id),
        threadId
          ? getThread(tx, ctx.workspace.id, ctx.user.id, threadId)
          : Promise.resolve(null),
        listAskEntities(tx, ctx.workspace.id, ctx.user.id),
      ]);
      return { bookings, reminders, openThread, entities };
    },
  );

  const comingUp = bookings.slice(0, HOME_PREVIEW);

  return (
    <HomeAsk
      key={openThread?.id ?? "new"}
      greeting={greeting}
      configured={configured}
      suggestions={[
        t("suggestion_viewings"),
        t("suggestion_pipeline"),
        t("suggestion_deposit"),
      ]}
      threadId={openThread?.id ?? null}
      threadTitle={openThread?.title ?? null}
      initialMessages={openThread?.messages ?? []}
      entities={entities}
    >
      {comingUp.length > 0 ? (
        <HomeSection
          title={t("title")}
          action={
            <div className="flex items-center gap-3">
              <Link
                href={mine ? "/home" : "/home?mine=1"}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {mine ? t("show_all") : t("mine")}
              </Link>
              <Link
                href="/calendar"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("see_all")}
              </Link>
            </div>
          }
        >
          {comingUp.map((row) => (
            <HomeRow
              key={row.id}
              href={`/properties/${row.propertyId}/viewings`}
              title={row.propertyTitle}
              meta={`${formatDate(
                row.startsAt,
                {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                },
                row.timezone,
              )}${row.assignedAgentName ? ` · ${row.assignedAgentName}` : ""}`}
            />
          ))}
        </HomeSection>
      ) : null}
      <NeedsAttention items={reminders} />
    </HomeAsk>
  );
}
