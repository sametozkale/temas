/** IANA timezones for workspace / property settings. */
export const TIMEZONES: readonly string[] = Intl.supportedValuesOf("timeZone");

export type Timezone = string;

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
