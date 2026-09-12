import { inngest } from "@/inngest/client";
import { integrations } from "@/lib/env";
import { materializeCalendar } from "@/lib/viewings/materialize";

/** Enqueue Inngest when configured; otherwise materialize inline (dev). */
export async function enqueueMaterialize(calendarId: string) {
  if (integrations.inngestCloud()) {
    await inngest.send({
      name: "slots/materialize",
      data: { calendarId },
    });
    return;
  }
  await materializeCalendar(calendarId);
}
