import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookingFlow } from "@/components/viewings/booking-flow";
import { EmptyState } from "@/components/empty-state";
import { Calendar03Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { formatAddress } from "@/lib/format";
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

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-3xl tracking-tight">
          {found.property.title}
        </h1>
        {address ? (
          <p className="text-sm text-muted-foreground">{address}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t("timezone_note", { timezone: found.property.timezone })}
        </p>
      </header>
      {slots.length === 0 ? (
        <EmptyState
          icon={Calendar03Icon}
          title={t("empty_title")}
          description={t("empty_description")}
        />
      ) : (
        <BookingFlow
          token={token}
          timezone={found.property.timezone}
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
