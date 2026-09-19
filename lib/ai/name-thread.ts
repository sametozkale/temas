import { generateObject } from "ai";
import { z } from "zod";

import { isTextConfigured, textModel } from "@/lib/ai/models";
import { languageInstruction } from "@/lib/ai/languages";
import { loadPrompt } from "@/lib/ai/prompts";

const nameSchema = z.object({
  title: z.string().min(1).max(60),
});

export function mockThreadTitle(question: string) {
  const cleaned = question
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?!.]+$/g, "")
    .replace(
      /^(how many|how much|which|what|who|when|where|why|is there|are there|can you|could you|please)\s+/i,
      "",
    );
  if (!cleaned) return "New chat";
  const words = cleaned.split(" ").slice(0, 6);
  const [first = "", ...rest] = words;
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}${
    rest.length ? ` ${rest.join(" ")}` : ""
  }`.slice(0, 60);
}

export async function nameThread(question: string, language = "auto") {
  const model = textModel("haiku");
  if (!isTextConfigured() || !model) {
    return mockThreadTitle(question);
  }
  try {
    const { object } = await generateObject({
      model,
      schema: nameSchema,
      system: `${loadPrompt("name-thread.md")}\n${languageInstruction(language)}`,
      prompt: question,
    });
    const title = object.title.trim().replace(/^["']+|["']+$/g, "");
    return title.slice(0, 60) || mockThreadTitle(question);
  } catch {
    return mockThreadTitle(question);
  }
}
