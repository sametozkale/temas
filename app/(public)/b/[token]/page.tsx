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

  const slots = await listOpenSlots(db, found.calendar.id, new Date());
  const address = formatAddress(found.property.address);
  let assignedAgentName: string | null = null;
  if (found.property.assignedUserId) {
    const [agent] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, found.property.assignedUserId))
      .limit(1);
    assignedAgentName = agent?.fullName ?? null;
  }
  const form = found.calendar.formId
    ? await getFormByProperty(db, found.property.id)
    : null;
  const cookieStore = await cookies();
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
