import { inngest } from "@/inngest/client";
import { integrations } from "@/lib/env";
import {
  syncAllGmail,
  syncGmailIntegration,
} from "@/lib/integrations/gmail/sync";

export async function enqueueInboxSync(
  input: {
    integrationId?: string;
    workspaceId?: string;
  } = {},
) {
  if (integrations.inngestCloud()) {
    await inngest.send({
      name: "inbox/sync",
      data: input,
    });
    return;
  }
  if (input.integrationId) {
    await syncGmailIntegration(input.integrationId);
    return;
  }
  await syncAllGmail();
}
