import { generateObject } from "ai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  contacts,
  conversations,
  messages,
  properties,
  tasks,
} from "@/lib/db/schema";
import { isTextConfigured, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/db/schema/tasks";

const extractSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        priority: z.enum(TASK_PRIORITIES).default("medium"),
      }),
    )
    .max(5),
  completed: z
    .array(
      z.object({
        fingerprint: z.string().min(1).max(200).optional(),
        title: z.string().min(1).max(200).optional(),
      }),
    )
    .max(10)
    .default([]),
});

export type ExtractedTaskItem = z.infer<typeof extractSchema>["tasks"][number];

export function taskFingerprint(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveCompletedFingerprints(
  completed: { fingerprint?: string; title?: string }[],
  existing: { fingerprint: string }[],
): string[] {
  const known = new Set(existing.map((row) => row.fingerprint));
  const matched = new Set<string>();
  for (const item of completed) {
    const byId = item.fingerprint?.trim();
    if (byId && known.has(byId)) matched.add(byId);
    const byTitle = item.title ? taskFingerprint(item.title) : "";
    if (byTitle && known.has(byTitle)) matched.add(byTitle);
  }
  return [...matched];
}

export function planInboxTaskExtract(input: {
  existing: { fingerprint: string }[];
  open: ExtractedTaskItem[];
  completed: { fingerprint?: string; title?: string }[];
}): { insert: ExtractedTaskItem[]; completeFingerprints: string[] } {
  const completeFingerprints = resolveCompletedFingerprints(
    input.completed,
    input.existing,
  );
  const skip = new Set([
    ...input.existing.map((row) => row.fingerprint),
    ...completeFingerprints,
  ]);
  const insert: ExtractedTaskItem[] = [];
  const seen = new Set<string>();
  for (const item of input.open) {
    const fingerprint = taskFingerprint(item.title);
    if (!fingerprint || skip.has(fingerprint) || seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);
    insert.push(item);
  }
  return { insert, completeFingerprints };
}

const DONE_SIGNAL =
  /\b(thanks|thank you|received|got (the )?keys|already sent|done|sorted|completed|confirmed)\b/i;

export function mockExtractTasks(payload: {
  subject: string | null;
  lastInbound: string;
  lastOutbound?: string;
  existing?: { fingerprint: string; title: string }[];
}): z.infer<typeof extractSchema> {
  const hay =
    `${payload.subject ?? ""} ${payload.lastInbound} ${payload.lastOutbound ?? ""}`.toLowerCase();
  const existing = payload.existing ?? [];
  if (existing.length > 0 && DONE_SIGNAL.test(hay)) {
    return {
      tasks: [],
      completed: existing.map((row) => ({ fingerprint: row.fingerprint })),
    };
  }
  if (
    !/\b(call|send|chase|follow up|deposit|keys|contract|viewing|confirm)\b/.test(
      hay,
    )
  ) {
    return { tasks: [], completed: [] };
  }
  return {
    tasks: [
      {
        title: "Follow up on this conversation",
        description: "An inbound message looks like it needs an action.",
        priority: "medium",
      },
    ],
    completed: [],
  };
}

export async function extractTasksFromConversation(conversationId: string) {
  const [row] = await db
    .select({
      conversation: conversations,
      contactName: contacts.fullName,
      propertyTitle: properties.title,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(properties, eq(properties.id, conversations.propertyId))
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!row) return { skipped: true as const, reason: "not_found" };

  const history = await db
    .select({
      direction: messages.direction,
      body: messages.body,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.sentAt), desc(messages.createdAt))
    .limit(12);

  const thread = [...history].reverse();
  if (thread.length === 0) {
    return { skipped: true as const, reason: "no_messages" };
  }

  const existing = await db
    .select({
      fingerprint: tasks.fingerprint,
      title: tasks.title,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.conversationId, conversationId),
        inArray(tasks.status, ["suggested", "open"]),
      ),
    );

  const tracked = existing
    .filter((item): item is { fingerprint: string; title: string } =>
      Boolean(item.fingerprint),
    )
    .map((item) => ({ fingerprint: item.fingerprint, title: item.title }));

  const lastInbound =
    thread.filter((m) => m.direction === "in").at(-1)?.body ?? "";
  const lastOutbound =
    thread.filter((m) => m.direction === "out").at(-1)?.body ?? "";

  const payload = {
    subject: row.conversation.subject,
    contactName: row.contactName,
    propertyTitle: row.propertyTitle,
    messages: thread,
    existingTasks: tracked,
  };

  const generated = isTextConfigured()
    ? await generateExtracted(payload)
    : mockExtractTasks({
        subject: row.conversation.subject,
        lastInbound,
        lastOutbound,
        existing: tracked,
      });

  const plan = planInboxTaskExtract({
    existing: tracked,
    open: generated.tasks,
    completed: generated.completed ?? [],
  });

  let completed = 0;
  if (plan.completeFingerprints.length > 0) {
    const updated = await db
      .update(tasks)
      .set({ status: "done", userId: null })
      .where(
        and(
          eq(tasks.conversationId, conversationId),
          inArray(tasks.fingerprint, plan.completeFingerprints),
          inArray(tasks.status, ["suggested", "open"]),
        ),
      )
      .returning({ id: tasks.id });
    completed = updated.length;
  }

  let inserted = 0;
  for (const item of plan.insert) {
    const fingerprint = taskFingerprint(item.title);
    const priority: TaskPriority = item.priority ?? "medium";
    try {
      await db.insert(tasks).values({
        workspaceId: row.conversation.workspaceId,
        propertyId: row.conversation.propertyId,
        title: item.title.trim(),
        description: item.description?.trim() || null,
        priority,
        status: "suggested",
        source: "ai",
        assigneeId: row.conversation.userId,
        createdBy: row.conversation.userId,
        conversationId,
        fingerprint,
        userId: row.conversation.userId,
      });
      inserted += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
          : "";
      if (!/duplicate|unique/i.test(message)) throw error;
    }
  }

  return { skipped: false as const, inserted, completed };
}

async function generateExtracted(payload: Record<string, unknown>) {
  const model = textModel("haiku");
  if (!model) {
    return mockExtractTasks({
      subject: typeof payload.subject === "string" ? payload.subject : null,
      lastInbound: "",
    });
  }
  const { object } = await generateObject({
    model,
    schema: extractSchema,
    system: loadPrompt("extract-tasks.md"),
    prompt: JSON.stringify(payload),
  });
  return object;
}
