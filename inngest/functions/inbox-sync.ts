import { inngest } from "@/inngest/client";
import {
  syncAllGmail,
  syncGmailIntegration,
} from "@/lib/integrations/gmail/sync";

export const inboxSync = inngest.createFunction(
  {
    id: "inbox-sync",
    debounce: { period: "5s", key: "event.data.integrationId" },
    triggers: [{ event: "inbox/sync" }],
  },
  async ({ event }) => {
    const integrationId = event.data.integrationId as string | undefined;
    if (integrationId) return syncGmailIntegration(integrationId);
    return syncAllGmail();
  },
);

/** Poll Gmail history when Pub/Sub is not configured. */
export const inboxSyncCron = inngest.createFunction(
  {
    id: "inbox-sync-cron",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async () => syncAllGmail(),
);
