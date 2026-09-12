import { inngest } from "@/inngest/client";
import { scanReminders, sendReminderDigests } from "@/lib/reminders/scan";

export const reminderScan = inngest.createFunction(
  {
    id: "reminder-scan",
    triggers: [{ cron: "0 */2 * * *" }],
  },
  async () => scanReminders(),
);

export const reminderDigest = inngest.createFunction(
  {
    id: "reminder-digest",
    triggers: [{ cron: "0 4 * * *" }],
  },
  async () => sendReminderDigests(),
);
