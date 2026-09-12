import { inngest } from "@/inngest/client";
import { materializeAllActive } from "@/lib/viewings/materialize";

/** 04:00 Europe/Istanbul = 01:00 UTC (permanent UTC+3). */
export const advanceHorizon = inngest.createFunction(
  {
    id: "advance-slot-horizon",
    triggers: [{ cron: "0 1 * * *" }],
  },
  async () => {
    return materializeAllActive();
  },
);
