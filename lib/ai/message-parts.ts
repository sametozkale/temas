import { isToolUIPart } from "ai";

import type { AskUIMessage } from "@/lib/ai/types";

/** Data URLs larger than this stay in the live request only, not in the thread row. */
const STORED_FILE_URL_MAX = 6_000_000;

/**
 * File parts worth keeping on the user row so a later confirmation (including
 * after a reload) can still save them onto a property.
 */
export function storedUserParts(
  parts: AskUIMessage["parts"] | undefined,
): AskUIMessage["parts"] | undefined {
  if (!parts) return undefined;
  const kept = parts.filter((part) => {
    if (part.type === "text") return part.text.trim().length > 0;
    if (part.type !== "file") return false;
    return part.url.startsWith("data:") && part.url.length <= STORED_FILE_URL_MAX;
  });
  return kept.some((part) => part.type === "file") ? kept : undefined;
}

/**
 * Older attachments stay on the card and in `scope.files`, but only the latest
 * user message that has files is sent to the model.
 */
export function filesForModel(messages: AskUIMessage[]): AskUIMessage[] {
  let keep = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === "user" && message.parts.some((part) => part.type === "file")) {
      keep = i;
      break;
    }
  }
  return messages.map((message, index) =>
    message.role === "user" && index !== keep
      ? { ...message, parts: message.parts.filter((part) => part.type !== "file") }
      : message,
  );
}

/**
 * A Confirm that never finished leaves `approval-responded` with no output.
 * Loaded threads turn that back into a confirmation card.
 */
export function reviveUnfinishedApprovals(
  parts: AskUIMessage["parts"],
): AskUIMessage["parts"] {
  return parts.map((part) => {
    if (isToolUIPart(part) && part.state === "approval-responded") {
      const { approved, ...approval } = part.approval;
      void approved;
      return {
        ...part,
        state: "approval-requested",
        approval,
      } as unknown as AskUIMessage["parts"][number];
    }
    return part;
  });
}
