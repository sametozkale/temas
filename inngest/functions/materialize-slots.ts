import { inngest } from "@/inngest/client";
import { revalidatePublicBookingByCalendar } from "@/lib/public-cache";
import { materializeCalendar } from "@/lib/viewings/materialize";

export const materializeSlots = inngest.createFunction(
  {
    id: "materialize-slots",
    debounce: { period: "2s", key: "event.data.calendarId" },
    triggers: [{ event: "slots/materialize" }],
  },
  async ({ event }) => {
    const calendarId = event.data.calendarId as string;
    const result = await materializeCalendar(calendarId);
    await revalidatePublicBookingByCalendar(calendarId);
    return result;
  },
);
