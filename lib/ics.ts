/** Minimal iCalendar payload (docs/04 §4). */
export function buildViewingIcs(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
  url?: string;
}): string {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const uid = `${stamp(input.startsAt)}-${Math.random().toString(36).slice(2)}@havn`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Havn//Viewing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : null,
    input.url ? `URL:${input.url}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.filter(Boolean).join("\r\n");
}

function escapeIcs(value: string) {
  return value.replace(/[\\;,\n]/g, (c) => {
    if (c === "\n") return "\\n";
    return `\\${c}`;
  });
}
