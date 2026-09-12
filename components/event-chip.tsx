import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Colour accent used by calendar rows. Maps to docs/01 §8:
 * brand = intersection / available slot, chart-1 = agent window,
 * chart-2 = current tenant window, chart-3 = owner window.
 */
export type EventChipTone =
  "brand" | "agent" | "tenant" | "owner" | "success" | "warning" | "muted";

const toneClasses: Record<EventChipTone, string> = {
  brand: "bg-brand",
  agent: "bg-chart-1",
  tenant: "bg-chart-2",
  owner: "bg-chart-3",
  success: "bg-success",
  warning: "bg-warning",
  muted: "bg-muted-foreground/40",
};

type EventChipProps = React.ComponentProps<"div"> & {
  tone?: EventChipTone;
  /** Left column: time label (e.g. "14:30"). */
  time?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
};

/**
 * Granola "Coming up" row: thin colour bar, time, title, muted meta.
 * Use inside a `divide-y` list.
 */
export function EventChip({
  tone = "brand",
  time,
  title,
  meta,
  className,
  ...props
}: EventChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 text-sm transition-colors hover:bg-accent/40",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn("h-8 w-0.5 shrink-0 rounded-full", toneClasses[tone])}
      />
      {time ? (
        <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
          {time}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{title}</p>
        {meta ? (
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        ) : null}
      </div>
    </div>
  );
}
