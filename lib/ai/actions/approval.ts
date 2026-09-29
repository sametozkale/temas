import { webcrypto } from "node:crypto";

import { isToolUIPart, getToolName, type Tool, type UIMessageStreamWriter } from "ai";

import type { AskUIMessage } from "@/lib/ai/types";

import { needsApproval } from "./policy";

const encoder = new TextEncoder();

function canonical(value: unknown): string {
  if (value === null || value === undefined || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? "null" : canonical(item))).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

/** Must stay byte-compatible with the `ai-sdk-tool-approval-v1` payload `streamText` signs. */
export async function verifyApproval(input: {
  secret: string;
  signature: string;
  approvalId: string;
  toolCallId: string;
  toolName: string;
  toolInput: unknown;
}): Promise<boolean> {
  const digest = Buffer.from(
    await webcrypto.subtle.digest("SHA-256", encoder.encode(canonical(input.toolInput))),
  ).toString("base64url");
  const key = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const payload = encoder.encode(
    JSON.stringify([
      "ai-sdk-tool-approval-v1",
      input.approvalId,
      input.toolCallId,
      input.toolName,
      digest,
    ]),
  );
  return webcrypto.subtle.verify(
    "HMAC",
    key,
    Buffer.from(input.signature, "base64url"),
    payload,
  );
}

type Schema = { safeParse?: (value: unknown) => { success: boolean; data?: unknown } };

/**
 * Without a model, Confirm / Cancel still has to settle the card: run the
 * approved call (signature checked) or mark it denied. Otherwise the client
 * keeps resubmitting the same unanswered approval.
 */
export async function settleApprovals(input: {
  writer: UIMessageStreamWriter<AskUIMessage>;
  tools: Record<string, Tool>;
  message: AskUIMessage | undefined;
  secret: string | undefined;
}) {
  for (const part of input.message?.parts ?? []) {
    if (!isToolUIPart(part) || part.state !== "approval-responded") continue;
    const toolCallId = part.toolCallId;
    const name = getToolName(part);
    if (!part.approval.approved) {
      input.writer.write({ type: "tool-output-denied", toolCallId });
      continue;
    }
    const tool = input.tools[name];
    const signature = (part.approval as { signature?: string }).signature;
    const valid =
      Boolean(tool?.execute) &&
      needsApproval(name, part.input) &&
      Boolean(input.secret && signature) &&
      (await verifyApproval({
        secret: input.secret!,
        signature: signature!,
        approvalId: part.approval.id,
        toolCallId,
        toolName: name,
        toolInput: part.input,
      }));
    if (!valid) {
      input.writer.write({ type: "tool-output-error", toolCallId, errorText: "expired" });
      continue;
    }
    const parsed = (tool!.inputSchema as Schema | undefined)?.safeParse?.(part.input);
    if (parsed && !parsed.success) {
      input.writer.write({
        type: "tool-output-available",
        toolCallId,
        output: { ok: false, error: "invalid" },
      });
      continue;
    }
    try {
      const output = await tool!.execute!(parsed ? parsed.data : part.input, {
        toolCallId,
        messages: [],
        context: undefined as never,
      });
      input.writer.write({ type: "tool-output-available", toolCallId, output });
    } catch {
      input.writer.write({ type: "tool-output-error", toolCallId, errorText: "failed" });
    }
  }
}
