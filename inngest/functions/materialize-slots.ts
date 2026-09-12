import { inngest } from "@/inngest/client";
import { materializeCalendar } from "@/lib/viewings/materialize";

export const materializeSlots = inngest.createFunction(
  {
    id: "materialize-slots",
    debounce: { period: "2s", key: "event.data.calendarId" },
    triggers: [{ event: "slots/materialize" }],
  },
  async ({ event }) => {
    const calendarId = event.data.calendarId as string;
    return materializeCalendar(calendarId);
  },
);
