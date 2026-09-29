import { createHmac, createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { AskUIMessage } from "@/lib/ai/types";

import { settleApprovals, verifyApproval } from "./approval";

const secret = "test-secret";

function sign(approvalId: string, toolCallId: string, toolName: string, input: string) {
  const digest = createHash("sha256").update(input).digest("base64url");
  return createHmac("sha256", secret)
    .update(JSON.stringify(["ai-sdk-tool-approval-v1", approvalId, toolCallId, toolName, digest]))
    .digest("base64url");
}

const input = { propertyId: "4562d154-c542-4ace-a203-d012518908e5" };
const canonicalInput = '{"propertyId":"4562d154-c542-4ace-a203-d012518908e5"}';

function message(approved: boolean, signature: string): AskUIMessage {
  return {
    id: "m1",
    role: "assistant",
    parts: [
      {
        type: "tool-rotateOwnerLink",
        toolCallId: "c1",
        state: "approval-responded",
        input,
        approval: { id: "a1", approved, signature },
      },
    ],
  } as unknown as AskUIMessage;
}

describe("verifyApproval", () => {
  it("accepts the signature streamText would produce and rejects a changed input", async () => {
    const signature = sign("a1", "c1", "rotateOwnerLink", canonicalInput);
    const base = { secret, signature, approvalId: "a1", toolCallId: "c1", toolName: "rotateOwnerLink" };
    expect(await verifyApproval({ ...base, toolInput: input })).toBe(true);
    expect(await verifyApproval({ ...base, toolInput: { propertyId: "other" } })).toBe(false);
  });
});

describe("settleApprovals", () => {
  it("runs a confirmed call once and denies a cancelled one", async () => {
    const execute = vi.fn(async () => ({ ok: true, summary: "Done." }));
    const tools = { rotateOwnerLink: { inputSchema: undefined, execute } } as never;
    const writes: unknown[] = [];
    const writer = { write: (chunk: unknown) => writes.push(chunk) } as never;
    const signature = sign("a1", "c1", "rotateOwnerLink", canonicalInput);

    await settleApprovals({ writer, tools, message: message(true, signature), secret });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(writes).toEqual([
      { type: "tool-output-available", toolCallId: "c1", output: { ok: true, summary: "Done." } },
    ]);

    writes.length = 0;
    await settleApprovals({ writer, tools, message: message(false, signature), secret });
    expect(writes).toEqual([{ type: "tool-output-denied", toolCallId: "c1" }]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not run a call with a forged signature", async () => {
    const execute = vi.fn();
    const tools = { rotateOwnerLink: { inputSchema: undefined, execute } } as never;
    const writes: unknown[] = [];
    const writer = { write: (chunk: unknown) => writes.push(chunk) } as never;

    await settleApprovals({ writer, tools, message: message(true, "forged"), secret });
    expect(execute).not.toHaveBeenCalled();
    expect(writes).toEqual([{ type: "tool-output-error", toolCallId: "c1", errorText: "expired" }]);
  });
});
