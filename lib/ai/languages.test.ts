import { describe, expect, it } from "vitest";

import {
  AI_LANGUAGE_AUTO,
  aiLanguageName,
  isAiLanguage,
  languageInstruction,
  normalizeAiLanguage,
} from "./languages";

describe("AI languages", () => {
  it("accepts auto and known codes", () => {
    expect(isAiLanguage("auto")).toBe(true);
    expect(isAiLanguage("tr")).toBe(true);
    expect(isAiLanguage("xx")).toBe(false);
  });

  it("falls back to match-the-prompt", () => {
    expect(normalizeAiLanguage(undefined)).toBe(AI_LANGUAGE_AUTO);
    expect(normalizeAiLanguage("nope")).toBe(AI_LANGUAGE_AUTO);
    expect(normalizeAiLanguage("de")).toBe("de");
  });

  it("labels a pinned language in English", () => {
    expect(aiLanguageName("tr")).toBe("Turkish");
    expect(aiLanguageName("en")).toBe("English");
  });

  it("instructs the model to follow the prompt by default", () => {
    expect(languageInstruction("auto")).toMatch(/same language/i);
    expect(languageInstruction("fr")).toMatch(/French/);
  });
});
