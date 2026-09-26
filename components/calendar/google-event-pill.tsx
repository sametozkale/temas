"use client";

import { useTranslations } from "next-intl";

import { namedEventTone } from "@/lib/calendar/event-tone";
import { GoogleEventColorMenu, useGoogleEventColor } from "@/components/calendar/google-event-color";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function GoogleEventPill({
  time,
  title,
  when,
  location,
  calendarName,
  color,
  colorId,
  calendarId,
  seriesKey,
  writable,
  stacked = false,
  deferTime = false,
  block = false,
}: {
  time: string;
  title: string;
  when: string;
  location: string | null;
  calendarName: string;
  color: string | null;
  colorId: string | null;
  calendarId: string;
  seriesKey: string;
  writable: boolean;
  stacked?: boolean;
  /** Past days keep the clock time off the card until hover. */
  deferTime?: boolean;
  /** Week time grid: the block fills its duration. */
  block?: boolean;
}) {
  const t = useTranslations("calendar");
  const label = time || t("google_all_day");
  const hideTime = deferTime && Boolean(time);
  const painted = useGoogleEventColor(seriesKey, color, colorId);
  const tint = painted.color
    ? {
        backgroundColor: `color-mix(in srgb, ${painted.color} 18%, var(--card))`,
      }
    : undefined;

  return (
    <Popover>
      <GoogleEventColorMenu
        enabled={writable}
        calendarId={calendarId}
        eventId={seriesKey}
        seriesKey={seriesKey}
        color={color}
        colorId={colorId}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title={`${label} ${title}`}
            style={tint}
            className={cn(
              "group flex min-w-0 rounded-[3px] text-left text-[11px] hover:brightness-[0.97]",
              block
                ? "h-full w-full flex-col items-start justify-start overflow-hidden px-1 py-0.5 leading-tight"
                : stacked
                  ? "w-full min-w-0 flex-col gap-0.5 px-1.5 py-1 leading-snug"
                  : "h-5 items-center gap-1 px-1 leading-none",
              painted.color ? "text-foreground" : namedEventTone(title),
            )}
          >
            <span className={cn("flex min-w-0 gap-1", (stacked || block) && "items-start")}>
              <span
                className={cn(
                  "shrink-0 tabular-nums text-muted-foreground",
                  hideTime &&
                    "hidden group-hover:inline group-focus-visible:inline",
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  "min-w-0 font-medium wrap-break-word",
                  stacked || block ? "wrap-break-word" : "truncate",
                )}
              >
                {title}
              </span>
            </span>
            {stacked && !block && !isEmailAddress(calendarName) ? (
              <span className="line-clamp-2 wrap-anywhere text-muted-foreground">
                {calendarName}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
      </GoogleEventColorMenu>
      <PopoverContent align="start" className="w-64 gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{when || label}</p>
        {location ? (
          <p className="text-xs text-muted-foreground">{location}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{calendarName}</p>
      </PopoverContent>
    </Popover>
  );
}
