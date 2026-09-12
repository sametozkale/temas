import { getRequestConfig } from "next-intl/server";

export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";

/**
 * Single-locale v1 (docs/02 §6): no URL prefix, `tr` content only.
 * The locale will later come from `profiles.locale`.
 */
export default getRequestConfig(async () => {
  const locale: Locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Istanbul",
  };
});
