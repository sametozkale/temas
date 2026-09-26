import Link from "next/link";

import { cn } from "@/lib/utils";

const PROPERTY_TONES = [
  "bg-brand-soft text-brand-foreground",
  "bg-info-soft text-info",
  "bg-warning-soft text-warning",
  "bg-secondary text-chart-3",
  "bg-muted text-chart-5",
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
    return "bg-success-soft text-success";
  }
  if (status === "cancelled" || status === "no_show") {
    return "bg-muted text-muted-foreground";
  }
  return propertyTone(propertyId);
}

/**
 * Month stays one truncated line. Week time blocks fill their duration
 * and clip whatever does not fit.
 */
export function CalendarEventPill({
  href,
  time,
  title,
  hint,
  status,
  propertyId,
  stacked = false,
  deferTime = false,
  block = false,
}: {
  href: string;
  time: string;
  title: string;
  hint?: string;
  status: string;
  propertyId: string;
  stacked?: boolean;
  /** Past days keep the clock time off the card until hover. */
  deferTime?: boolean;
  /** Week time grid: the block fills its duration. */
  block?: boolean;
}) {
  return (
    <Link
      href={href}
      title={hint ? `${time} ${title} — ${hint}` : `${time} ${title}`}
      className={cn(
        "group flex min-w-0 rounded-[3px] text-[11px] transition-colors hover:brightness-[0.97]",
        block
          ? "h-full w-full flex-col items-start justify-start overflow-hidden px-1 py-0.5 leading-tight"
          : stacked
            ? "w-full min-w-0 flex-col gap-0.5 px-1.5 py-1 leading-snug"
            : "h-5 items-center gap-1 px-1 leading-none",
        statusTone(status, propertyId),
      )}
    >
      <span className={cn("flex min-w-0 gap-1", (stacked || block) && "items-start")}>
        <span
          className={cn(
            "shrink-0 tabular-nums opacity-70",
            deferTime && "hidden group-hover:inline group-focus-visible:inline",
          )}
        >
          {time}
        </span>
        <span className={cn("min-w-0 font-medium wrap-break-word", stacked || block ? "" : "truncate")}>
          {title}
        </span>
      </span>
      {(stacked || block) && hint ? (
        <span className="line-clamp-2 wrap-anywhere opacity-70">{hint}</span>
      ) : null}
    </Link>
  );
}
