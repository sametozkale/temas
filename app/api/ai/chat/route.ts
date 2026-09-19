import { NextResponse } from "next/server";

import { persistUserTurn, streamAsk, textFromMessages } from "@/lib/ai/ask";
import { getQuota } from "@/lib/ai/quota";
import type { AskUIMessage } from "@/lib/ai/types";
import { getAppContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIpFromHeaders } from "@/lib/http";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "ai.use");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const quota = await getQuota(db, ctx.workspace.id, ctx.workspace.timezone);
  if (quota.exhausted) {
    return NextResponse.json({ error: "quota_exhausted" }, { status: 429 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const chatLimit = await consumeRateLimit(
    `ai:${ctx.user.id}`,
    30,
    15 * 60 * 1000,
  );
  const ipLimit = await consumeRateLimit(`ai-ip:${ip}`, 60, 15 * 60 * 1000);
  if (!chatLimit.ok || !ipLimit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json: unknown = await req.json();
  const body =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const messages = Array.isArray(body.messages)
    ? (body.messages as AskUIMessage[])
    : [];
  const threadIdIn =
    typeof body.threadId === "string" && body.threadId.length > 0
      ? body.threadId
      : null;
  const question = textFromMessages(messages);
  if (!question) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { threadId, title, isNew } = await persistUserTurn({
    workspaceId: ctx.workspace.id,
    userId: ctx.user.id,
    threadId: threadIdIn,
    question,
  });

  return streamAsk({
    workspaceId: ctx.workspace.id,
    timeZone: ctx.workspace.timezone,
    userId: ctx.user.id,
    threadId,
    title,
    isNew,
    messages,
    question,
  });
}
