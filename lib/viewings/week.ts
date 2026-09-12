export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type WeekdayCode = (typeof WEEKDAYS)[number];

export type WeekCell = {
  weekday: WeekdayCode;
  enabled: boolean;
  startMin: number;
  endMin: number;
};

export const DEFAULT_START_MIN = 9 * 60;
export const DEFAULT_END_MIN = 17 * 60;

export function emptyWeek(): WeekCell[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    enabled: false,
    startMin: DEFAULT_START_MIN,
    endMin: DEFAULT_END_MIN,
  }));
}

export function rruleForDay(day: WeekdayCode) {
  return `FREQ=WEEKLY;BYDAY=${day}`;
}

export function weekdayFromRRule(rrule: string): WeekdayCode | null {
  const match = /BYDAY=([A-Z]{2})/.exec(rrule.toUpperCase());
  const code = match?.[1];
  if (code && (WEEKDAYS as readonly string[]).includes(code)) {
    return code as WeekdayCode;
  }
  return null;
}
