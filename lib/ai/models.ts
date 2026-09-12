import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

import { integrations } from "@/lib/env";

/** Model IDs live only here (docs/05 §7). */
export const MODELS = {
  sonnet: "claude-sonnet-4-5",
  haiku: "claude-haiku-4-5",
  embedding: "text-embedding-3-small",
} as const;

export type TextTier = "haiku" | "sonnet";

export function isTextConfigured() {
  return integrations.anthropic();
}

export function isEmbeddingConfigured() {
  return integrations.openai();
}

export function textModel(tier: TextTier) {
  if (!isTextConfigured()) return null;
  return anthropic(tier === "haiku" ? MODELS.haiku : MODELS.sonnet);
}

export function embeddingModel() {
  if (!isEmbeddingConfigured()) return null;
  return openai.embedding(MODELS.embedding);
}

export function modelLabel(tier: TextTier) {
  return isTextConfigured()
    ? tier === "haiku"
      ? MODELS.haiku
      : MODELS.sonnet
    : "mock";
}
