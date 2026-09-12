import { getRequestConfig } from "next-intl/server";

export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/**
 * Single-locale v1 (docs/02 §6): English only, no URL prefix. Additional
 * locales will be resolved from `profiles.locale` later.
 */
export default getRequestConfig(async () => {
  const locale: Locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Istanbul",
  };
});
