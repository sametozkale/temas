import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isTextUIPart,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessageStreamWriter,
} from "ai";
import { and, desc, eq } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import { db } from "@/lib/db";
import { aiMessages, aiThreads } from "@/lib/db/schema";
import { selectAskTools } from "@/lib/ai/intent";
import { isTextConfigured, modelLabel, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import { searchSnippets } from "@/lib/ai/rag";
import { createAskTools } from "@/lib/ai/tools";
import type { AskSource, AskUIMessage } from "@/lib/ai/types";

export function textFromMessages(messages: AskUIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    const text = message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

function collectSources(value: unknown, acc: AskSource[] = []) {
  if (!value || typeof value !== "object") return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectSources(item, acc);
    return acc;
  }
  const rec = value as Record<string, unknown>;
  if (Array.isArray(rec.sources)) {
    for (const s of rec.sources) {
      if (
        s &&
        typeof s === "object" &&
        "href" in s &&
        "title" in s &&
        "kind" in s
      ) {
        acc.push(s as AskSource);
      }
    }
  }
  for (const v of Object.values(rec)) collectSources(v, acc);
  return acc;
}

function uniqueSources(items: AskSource[]) {
  const seen = new Set<string>();
  return items.filter((s) => {
    if (seen.has(s.href)) return false;
    seen.add(s.href);
    return true;
  });
}

export async function persistUserTurn(input: {
  workspaceId: string;
  userId: string;
  threadId: string | null;
  question: string;
}) {
  let threadId = input.threadId;
  if (threadId) {
    const [existing] = await db
      .select({ id: aiThreads.id })
      .from(aiThreads)
      .where(
        and(
          eq(aiThreads.id, threadId),
          eq(aiThreads.workspaceId, input.workspaceId),
          eq(aiThreads.userId, input.userId),
        ),
      )
      .limit(1);
    if (!existing) threadId = null;
  }
  if (!threadId) {
    const [created] = await db
      .insert(aiThreads)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        title: input.question.slice(0, 80),
      })
      .returning({ id: aiThreads.id });
    threadId = created!.id;
  }
  await db.insert(aiMessages).values({
    threadId,
    role: "user",
    content: input.question,
  });
  return threadId;
}

export async function persistAssistantTurn(
  threadId: string,
  content: string,
  toolCalls?: unknown[],
) {
  await db.insert(aiMessages).values({
    threadId,
    role: "assistant",
    content,
    toolCalls: toolCalls ?? null,
  });
}

export async function streamAsk(input: {
  workspaceId: string;
  timeZone: string;
  threadId: string;
  messages: AskUIMessage[];
  question: string;
}) {
  const tools = createAskTools(input.workspaceId, input.timeZone);
  const snippets = await searchSnippets(input.workspaceId, input.question);
  const ragBlock =
    snippets.length > 0
      ? `\nRetrieved snippets:\n${snippets
          .map((s) => `- [${s.entity}] ${s.chunk}`)
          .join("\n")}`
      : "";

  const stream = createUIMessageStream<AskUIMessage>({
    originalMessages: input.messages,
    execute: async ({ writer }) => {
      writer.write({ type: "data-thread", data: { id: input.threadId } });
      if (!isTextConfigured()) {
        await writeMockAsk(writer, tools, input.question);
        return;
      }
      const model = textModel("sonnet");
      if (!model) {
        await writeMockAsk(writer, tools, input.question);
        return;
      }
      const result = streamText({
        model,
        system: `${loadPrompt("ask-system.md")}${ragBlock}`,
        messages: await convertToModelMessages(input.messages),
        tools,
        stopWhen: stepCountIs(6),
      });
      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
    onFinish: async ({ responseMessage }) => {
      const text = responseMessage.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join("\n");
      await persistAssistantTurn(input.threadId, text, [
        { model: modelLabel("sonnet") },
      ]);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

async function writeMockAsk(
  writer: UIMessageStreamWriter<AskUIMessage>,
  tools: ReturnType<typeof createAskTools>,
  question: string,
) {
  const needed = selectAskTools(question);
  const sources: AskSource[] = [];
  const sections: string[] = [];

  for (const name of needed) {
    try {
      const raw = await executeAskTool(tools, name, question);
      collectSources(raw, sources);
      if (
        raw &&
        typeof raw === "object" &&
        "count" in raw &&
        name === "listViewings"
      ) {
        const count = Number((raw as { count: number }).count);
        sections.push(
          count === 1
            ? "There is 1 viewing this month."
            : `There are ${count} viewings this month.`,
        );
      } else if (
        raw &&
        typeof raw === "object" &&
        "count" in raw &&
        name === "listApplications"
      ) {
        sections.push(
          `There are ${Number((raw as { count: number }).count)} applicants in the pipeline.`,
        );
      } else if (
        raw &&
        typeof raw === "object" &&
        "properties" in raw &&
        Array.isArray((raw as { properties: unknown[] }).properties)
      ) {
        const n = (raw as { properties: unknown[] }).properties.length;
        sections.push(
          n
            ? `I found ${n} matching properties.`
            : "I could not find matching properties.",
        );
      }
    } catch {
      // tool failed; skip
    }
  }

  if (sections.length === 0) {
    sections.push(
      "I can answer from this workspace when you ask about viewings, properties or applicants.",
    );
  }
  const text = sections.join(" ");
  writer.write({ type: "text-start", id: "t0" });
  writer.write({ type: "text-delta", id: "t0", delta: text });
  writer.write({ type: "text-end", id: "t0" });
  for (const source of uniqueSources(sources)) {
    writer.write({ type: "data-source", data: source });
  }
}

async function executeAskTool(
  tools: ReturnType<typeof createAskTools>,
  name: ReturnType<typeof selectAskTools>[number],
  question: string,
) {
  const opts = {
    toolCallId: name,
    messages: [] as never[],
    context: undefined as never,
  };
  switch (name) {
    case "listViewings":
      return tools.listViewings.execute?.({}, opts);
    case "searchProperties":
      return tools.searchProperties.execute?.({ query: question }, opts);
    case "searchConversations":
      return tools.searchConversations.execute?.({ query: question }, opts);
    case "getReminders":
      return tools.getReminders.execute?.({ status: "open" }, opts);
    case "listApplications":
      return tools.listApplications.execute?.({}, opts);
    case "getPropertyDetail":
      return null;
  }
}

export async function listThreads(
  tx: DbOrTx,
  workspaceId: string,
  userId: string,
) {
  return tx
    .select({
      id: aiThreads.id,
      title: aiThreads.title,
      createdAt: aiThreads.createdAt,
    })
    .from(aiThreads)
    .where(
      and(eq(aiThreads.workspaceId, workspaceId), eq(aiThreads.userId, userId)),
    )
    .orderBy(desc(aiThreads.createdAt))
    .limit(8);
}
