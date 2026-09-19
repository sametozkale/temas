import { inngest } from "@/inngest/client";
import { extractTasksFromConversation } from "@/lib/ai/extract-tasks";

export const extractInboxTasksJob = inngest.createFunction(
  {
    id: "inbox-extract-tasks",
    debounce: { period: "8s", key: "event.data.conversationId" },
    triggers: [{ event: "inbox/extract-tasks" }],
  },
  async ({ event }) => {
    const conversationId = event.data.conversationId as string;
    return extractTasksFromConversation(conversationId);
  },
);
