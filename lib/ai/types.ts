import type { UIMessage } from "ai";

import { AI_LANGUAGES, type AiLanguage } from "@/lib/ai/languages";

export { AI_LANGUAGES, type AiLanguage };
export const TONES = ["formal", "friendly", "short"] as const;
export type DraftTone = (typeof TONES)[number];

export type AskSource = {
  kind:
    | "property"
    | "conversation"
    | "calendar"
    | "application"
    | "person"
    | "task";
  href: string;
  title: string;
};

/** Server-resolved names of the records an action card points at. */
export type AskActionTargets = {
  toolCallId: string;
  rows: { key: string; value: string; id?: string }[];
};

export type AskDataParts = {
  source: AskSource;
  thread: { id: string; title?: string };
  target: AskActionTargets;
};

export type AskUIMessage = UIMessage<unknown, AskDataParts>;
