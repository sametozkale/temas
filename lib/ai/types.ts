import type { UIMessage } from "ai";

export const TONES = ["formal", "friendly", "short"] as const;
export type DraftTone = (typeof TONES)[number];

export const AI_LANGUAGES = ["en", "tr"] as const;
export type AiLanguage = (typeof AI_LANGUAGES)[number];

export type AskSource = {
  kind: "property" | "conversation" | "calendar" | "application";
  href: string;
  title: string;
};

export type AskDataParts = {
  source: AskSource;
  thread: { id: string };
};

export type AskUIMessage = UIMessage<unknown, AskDataParts>;
