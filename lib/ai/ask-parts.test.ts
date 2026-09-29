import { describe, expect, it } from "vitest";

import type { AskUIMessage } from "@/lib/ai/types";

import { filesForModel, reviveUnfinishedApprovals, storedUserParts } from "./message-parts";

function user(id: string, parts: AskUIMessage["parts"]): AskUIMessage {
  return { id, role: "user", parts };
}

describe("storedUserParts", () => {
  it("keeps text and small data-url files", () => {
    const parts = storedUserParts([
      { type: "text", text: "Save these" },
      { type: "file", url: "data:image/png;base64,aaa", mediaType: "image/png" },
      { type: "file", url: "https://example.com/a.png", mediaType: "image/png" },
    ]);
    expect(parts?.map((part) => part.type)).toEqual(["text", "file"]);
  });

  it("drops a message that has no file", () => {
    expect(storedUserParts([{ type: "text", text: "Hello" }])).toBeUndefined();
  });
});

describe("filesForModel", () => {
  it("sends only the latest user message's files to the model", () => {
    const messages = filesForModel([
      user("a", [
        { type: "text", text: "first" },
        { type: "file", url: "data:1", mediaType: "image/png" },
      ]),
      user("b", [
        { type: "text", text: "second" },
        { type: "file", url: "data:2", mediaType: "image/png" },
      ]),
    ]);
    expect(messages[0]?.parts.some((part) => part.type === "file")).toBe(false);
    expect(messages[1]?.parts.some((part) => part.type === "file")).toBe(true);
  });
});

describe("reviveUnfinishedApprovals", () => {
  it("turns a finished-looking confirm back into a card", () => {
    const [part] = reviveUnfinishedApprovals([
      {
        type: "tool-createTask",
        toolCallId: "c1",
        state: "approval-responded",
        input: { title: "Call" },
        approval: { id: "a1", approved: true },
      },
    ]);
    expect(part && "state" in part && part.state).toBe("approval-requested");
  });
});
