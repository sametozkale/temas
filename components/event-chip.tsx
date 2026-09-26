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
  /** Google colour for the bar, when the calendar sent one. */
  accent?: string | null;
  /** Left column: time label (e.g. "14:30"). */
  time?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Taller row whose hover wash fills the row, for the calendar list. */
  comfortable?: boolean;
};

/**
 * Granola "Coming up" row: thin colour bar, time, title, muted meta.
 * Use inside a `divide-y` list.
 */
export function EventChip({
  tone = "brand",
  accent,
  time,
  title,
  meta,
  comfortable = false,
  className,
  ...props
}: EventChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm transition-colors",
        comfortable
          ? "rounded-lg px-3 py-3 hover:bg-muted"
          : "py-2.5 hover:bg-accent/40",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "w-0.5 shrink-0 rounded-full",
          comfortable ? "self-stretch min-h-8" : "h-8",
          accent ? undefined : toneClasses[tone],
        )}
        style={accent ? { backgroundColor: accent } : undefined}
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
