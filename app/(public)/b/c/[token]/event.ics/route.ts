import { getBookingByCancelToken } from "@/lib/viewings/queries";
import { db } from "@/lib/db";
import { formatAddress } from "@/lib/format";
import { buildViewingIcs } from "@/lib/ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const row = await getBookingByCancelToken(db, token);
  if (!row || row.booking.status === "cancelled") {
    return new Response("Not found", { status: 404 });
  }

  const ics = buildViewingIcs({
    title: `Viewing · ${row.property.title}`,
    startsAt: row.slot.startsAt,
    endsAt: row.slot.endsAt,
    location: formatAddress(row.property.address),
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="viewing.ics"`,
    },
  });
}
