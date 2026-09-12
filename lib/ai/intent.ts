export function monthRange(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const start = zonedWallClock(timeZone, year, month, 1, 0, 0);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = zonedWallClock(timeZone, nextYear, nextMonth, 1, 0, 0);
  return { start, end, year, month };
}

/** Instant at which `timeZone` shows the given wall-clock date/time. */
export function zonedWallClock(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  return new Date(asUtc - tzOffsetMs(new Date(asUtc), timeZone));
}

function tzOffsetMs(date: Date, timeZone: string) {
  const name =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
      hour: "numeric",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0)) * 60_000;
}

export type AskToolName =
  | "searchProperties"
  | "getPropertyDetail"
  | "listViewings"
  | "listApplications"
  | "searchConversations"
  | "getReminders";

export function selectAskTools(question: string): AskToolName[] {
  const q = question.toLowerCase();
  const picked = new Set<AskToolName>();
  if (/viewing|calendar|booking|slot/.test(q)) picked.add("listViewings");
  if (/applicant|application|pipeline|form/.test(q)) {
    picked.add("listApplications");
  }
  if (/inbox|conversation|message|email/.test(q)) {
    picked.add("searchConversations");
  }
  if (/remind/.test(q)) picked.add("getReminders");
  if (/propert|portfolio|rent|listing/.test(q)) {
    picked.add("searchProperties");
  }
  if (picked.size === 0) {
    picked.add("searchProperties");
    picked.add("listViewings");
  }
  return [...picked];
}
