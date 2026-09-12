import { inngest } from "@/inngest/client";
import { embedProperty } from "@/lib/ai/embed";
import { summariseApplication } from "@/lib/ai/summary";

export const embedPropertyJob = inngest.createFunction(
  {
    id: "ai-embed-property",
    debounce: { period: "5s", key: "event.data.propertyId" },
    triggers: [{ event: "ai/embed-property" }],
  },
  async ({ event }) => {
    const propertyId = event.data.propertyId as string;
    return embedProperty(propertyId);
  },
);

export const applicantSummaryJob = inngest.createFunction(
  {
    id: "ai-applicant-summary",
    debounce: { period: "5s", key: "event.data.applicationId" },
    triggers: [{ event: "ai/applicant-summary" }],
  },
  async ({ event }) => {
    const applicationId = event.data.applicationId as string;
    return summariseApplication(applicationId);
  },
);
