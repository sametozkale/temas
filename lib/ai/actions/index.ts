import { createHash } from "node:crypto";

import type { FileUIPart } from "ai";

import type { AppContext } from "@/lib/auth";
import type { AskUIMessage } from "@/lib/ai/types";
import { env } from "@/lib/env";

import { lookupTools } from "./lookups";
import { needsApproval } from "./policy";
import { propertyTools } from "./properties";
import type { ActionScope } from "./run";
import { settingsTools } from "./settings";
import { workTools } from "./work";

export { ACTION_TOOL_NAMES, needsApproval } from "./policy";
export type { ActionOutcome } from "./run";

/** Files the agent attached in this conversation (live messages only). */
export function filesFromMessages(messages: AskUIMessage[]): FileUIPart[] {
  return messages
    .filter((m) => m.role === "user")
    .flatMap((m) => m.parts.filter((p): p is FileUIPart => p.type === "file"));
}

export function createActionScope(
  ctx: AppContext,
  threadId: string,
  messages: AskUIMessage[],
): ActionScope {
  return {
    ctx,
    threadId,
    files: filesFromMessages(messages),
    writes: { count: 0 },
    charges: { listingImport: 0 },
  };
}

export function createWriteTools(scope: ActionScope) {
  return {
    ...lookupTools(scope),
    ...propertyTools(scope),
    ...workTools(scope),
    ...settingsTools(scope),
  };
}

/**
 * HMAC key for signing approval requests so a client cannot approve a tool
 * call the server never asked about. Unset locally without a service key.
 */
export function approvalSecret(): string | undefined {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return undefined;
  return createHash("sha256").update(`ask-approval:${key}`).digest("hex");
}

/** `streamText({ toolApproval })`: server-owned risk tier per call. */
export function toolApproval({
  toolCall,
}: {
  toolCall: { toolName: string; input: unknown };
}) {
  return needsApproval(toolCall.toolName, toolCall.input)
    ? ("user-approval" as const)
    : undefined;
}
