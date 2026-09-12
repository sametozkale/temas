/** Curated timezone options for workspace / property settings. */
export const TIMEZONES = [
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Athens",
  "Asia/Dubai",
  "America/New_York",
  "America/Los_Angeles",
] as const;

export type Timezone = (typeof TIMEZONES)[number];

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
