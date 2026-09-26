/** Quiet chart tones. The same title always lands on the same one. */
export const NAMED_EVENT_TONES = [
  "bg-brand-soft text-brand-foreground",
  "bg-info-soft text-info",
  "bg-warning-soft text-warning",
  "bg-secondary text-chart-3",
  "bg-muted text-chart-5",
] as const;

export function namedEventTone(title: string) {
  const key = title.trim().toLocaleLowerCase("tr-TR");
  let n = 0;
  for (let i = 0; i < key.length; i += 1) {
    n = (n + key.charCodeAt(i) * (i + 1)) % NAMED_EVENT_TONES.length;
  }
  return NAMED_EVENT_TONES[n] ?? NAMED_EVENT_TONES[0];
}
