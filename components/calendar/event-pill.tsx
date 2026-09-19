import Link from "next/link";

import { cn } from "@/lib/utils";

const PROPERTY_TONES = [
  "border-l-brand bg-brand-soft text-brand-foreground",
  "border-l-info bg-info-soft text-info",
  "border-l-warning bg-warning-soft text-warning",
  "border-l-chart-3 bg-secondary text-chart-3",
  "border-l-chart-5 bg-muted text-chart-5",
] as const;

function propertyTone(propertyId: string) {
  let n = 0;
  for (let i = 0; i < propertyId.length; i += 1) {
    n = (n + propertyId.charCodeAt(i) * (i + 1)) % PROPERTY_TONES.length;
  }
  return PROPERTY_TONES[n] ?? PROPERTY_TONES[0];
}

function statusTone(status: string, propertyId: string) {
  if (status === "completed") {
    return "border-l-success bg-success-soft text-success";
  }
  if (status === "cancelled" || status === "no_show") {
    return "border-l-muted-foreground/40 bg-muted text-muted-foreground";
  }
  return propertyTone(propertyId);
}

/**
 * Notion-style month/week event: one truncated line, coloured left edge.
 */
export function CalendarEventPill({
  href,
  time,
  title,
  hint,
  status,
  propertyId,
}: {
  href: string;
  time: string;
  title: string;
  hint?: string;
  status: string;
  propertyId: string;
}) {
  return (
    <Link
      href={href}
      title={hint ? `${time} ${title} — ${hint}` : `${time} ${title}`}
      className={cn(
        "flex h-5 min-w-0 items-center gap-1 rounded-[3px] border-l-2 px-1 text-[11px] leading-none transition-colors hover:brightness-[0.97]",
        statusTone(status, propertyId),
      )}
    >
      <span className="shrink-0 tabular-nums opacity-70">{time}</span>
      <span className="min-w-0 truncate font-medium">{title}</span>
    </Link>
  );
}
