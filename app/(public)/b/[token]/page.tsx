import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookingFlow, BookingShell } from "@/components/viewings/booking-flow";
import { PublicForm } from "@/components/pipeline/public-form";
import { EmptyState } from "@/components/empty-state";
import { Calendar03Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatAddress } from "@/lib/format";
import { readFormCompletionCookie } from "@/lib/pipeline/answers";
import { getFormByProperty } from "@/lib/pipeline/queries";
import {
  getCalendarByPublicToken,
  listOpenSlots,
} from "@/lib/viewings/queries";

export const revalidate = 60;

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("booking");
  const found = await getCalendarByPublicToken(db, token);
  if (!found || !found.calendar.isPublished || found.property.deletedAt) {
    notFound();
  }

  const address = formatAddress(found.property.address);
  // Slots, the host name, the optional form, and the completion cookie do not
  // depend on each other once the calendar row exists. Run them together so a
  // slow database does not add three extra waits before the first byte.
  const [slots, agentRows, form, cookieStore] = await Promise.all([
    listOpenSlots(db, found.calendar.id, new Date()),
    found.property.assignedUserId
      ? db
          .select({ fullName: profiles.fullName })
          .from(profiles)
          .where(eq(profiles.id, found.property.assignedUserId))
          .limit(1)
      : Promise.resolve([]),
    found.calendar.formId
      ? getFormByProperty(db, found.property.id)
      : Promise.resolve(null),
    cookies(),
  ]);
  const assignedAgentName = agentRows[0]?.fullName ?? null;
  const formCompleted = Boolean(
    form && readFormCompletionCookie(cookieStore, form.id),
  );
  const needForm =
    found.calendar.requireFormFirst &&
    Boolean(form?.isPublished && form.publicToken) &&
    !formCompleted;

  const durationMin = found.calendar.slotDurationMin;
  const shell = {
    title: found.property.title,
    address,
    hostName: assignedAgentName,
    durationMin,
    timezone: found.property.timezone,
  };

  return (
    <div className="mx-auto w-full max-w-[56rem] max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:max-w-none lg:flex lg:min-h-[calc(100svh-8.5rem)] lg:items-center lg:justify-center">
      {needForm && form?.publicToken ? (
        <BookingShell {...shell}>
          <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
            <div>
              <h2 className="font-serif text-2xl tracking-tight">
                {t("form_first_title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("form_first_body")}
              </p>
            </div>
            <PublicForm
              token={form.publicToken}
              fields={form.schema}
              embedded
            />
          </div>
        </BookingShell>
      ) : slots.length === 0 ? (
        <BookingShell {...shell}>
          <div className="flex min-w-0 flex-1 items-center p-4 sm:p-6 lg:p-8">
            <EmptyState
              icon={Calendar03Icon}
              title={t("empty_title")}
              description={t("empty_description")}
            />
          </div>
        </BookingShell>
      ) : (
        <BookingFlow
          token={token}
          timezone={found.property.timezone}
          durationMin={durationMin}
          title={found.property.title}
          address={address}
          hostName={assignedAgentName}
          slots={slots.map((s) => ({
            id: s.id,
            startsAt: s.startsAt.toISOString(),
            endsAt: s.endsAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
