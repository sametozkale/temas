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

export type AskDataParts = {
  source: AskSource;
  thread: { id: string; title?: string };
};

export type AskUIMessage = UIMessage<unknown, AskDataParts>;
