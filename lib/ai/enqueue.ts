import { inngest } from "@/inngest/client";
import { integrations } from "@/lib/env";
import { embedProperty } from "@/lib/ai/embed";
import { summariseApplication } from "@/lib/ai/summary";

export async function enqueueEmbedProperty(propertyId: string) {
  if (integrations.inngestCloud()) {
    await inngest.send({
      name: "ai/embed-property",
      data: { propertyId },
    });
    return;
  }
  await embedProperty(propertyId);
}

export async function enqueueApplicantSummary(applicationId: string) {
  if (integrations.inngestCloud()) {
    await inngest.send({
      name: "ai/applicant-summary",
      data: { applicationId },
    });
    return;
  }
  await summariseApplication(applicationId);
}
