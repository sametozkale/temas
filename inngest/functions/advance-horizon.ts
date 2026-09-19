import { inngest } from "@/inngest/client";
import { revalidatePublicBookingByCalendar } from "@/lib/public-cache";
import { materializeAllActive } from "@/lib/viewings/materialize";

/** 04:00 Europe/Istanbul = 01:00 UTC (permanent UTC+3). */
export const advanceHorizon = inngest.createFunction(
  {
    id: "advance-slot-horizon",
    triggers: [{ cron: "0 1 * * *" }],
  },
  async () => {
    const results = await materializeAllActive();
    await Promise.all(
      results.map((row) => revalidatePublicBookingByCalendar(row.calendarId)),
    );
    return results;
  },
);
