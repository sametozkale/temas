export const AI_LANGUAGE_AUTO = "auto";

/** Pinned first, then the rest of `AI_LANGUAGES` in this file order. */
export const AI_LANGUAGES = [
  "auto",
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "pt",
  "pl",
  "ro",
  "ru",
  "uk",
  "el",
  "bg",
  "cs",
  "hu",
  "sk",
  "sl",
  "hr",
  "sr",
  "bs",
  "sq",
  "mk",
  "sv",
  "da",
  "no",
  "fi",
  "et",
  "lv",
  "lt",
  "ar",
  "fa",
  "he",
  "ka",
  "az",
  "hy",
  "zh",
  "ja",
  "ko",
] as const;

export type AiLanguage = (typeof AI_LANGUAGES)[number];

const AI_LANGUAGE_SET = new Set<string>(AI_LANGUAGES);

export function isAiLanguage(value: string): value is AiLanguage {
  return AI_LANGUAGE_SET.has(value);
}

export function normalizeAiLanguage(
  value: string | null | undefined,
): AiLanguage {
  if (value && isAiLanguage(value)) return value;
  return AI_LANGUAGE_AUTO;
}

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

/** English name for a BCP 47 code. `auto` is labelled in the UI via i18n. */
export function aiLanguageName(code: Exclude<AiLanguage, "auto">): string {
  return displayNames.of(code) ?? code;
}

export function languageInstruction(code: string): string {
  const language = normalizeAiLanguage(code);
  if (language === AI_LANGUAGE_AUTO) {
    return "Reply in the same language as the user's latest message (or the thread, if that message is too short to tell). Do not switch languages unless they do.";
  }
  return `Reply in ${aiLanguageName(language)}. Keep that language even if the user writes in another, unless they explicitly ask to switch.`;
}
