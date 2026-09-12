import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CancelBookingButton } from "@/components/viewings/cancel-booking-button";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatAddress, formatDateTime } from "@/lib/format";
import { getBookingByCancelToken } from "@/lib/viewings/queries";

export default async function BookingManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("booking");
  const row = await getBookingByCancelToken(db, token);
  if (!row) notFound();

  const cancelled = row.booking.status === "cancelled";
  const when = formatDateTime(row.slot.startsAt, row.property.timezone);
  const address = formatAddress(row.property.address);

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {cancelled ? t("cancelled_kicker") : t("confirmed_kicker")}
        </p>
        <h1 className="font-serif text-3xl tracking-tight">
          {cancelled ? t("cancelled_title") : t("confirmed_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{row.property.title}</p>
        <p className="text-sm font-medium">{when}</p>
        {address ? (
          <p className="text-sm text-muted-foreground">{address}</p>
        ) : null}
      </header>
      {cancelled ? (
        <Button variant="ghost" asChild>
          <Link href={`/b/${row.token}`}>{t("book_again")}</Link>
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/b/c/${token}/event.ics`}>{t("add_to_calendar")}</a>
          </Button>
          <CancelBookingButton token={token} />
        </div>
      )}
    </div>
  );
}
