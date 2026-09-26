"use client";

import { useEffect, useRef, type ReactNode } from "react";

import {
  placeTimedEvents,
  WEEK_DAY_MINUTES,
  WEEK_HOUR_PX,
} from "@/lib/calendar/week-layout";
import { cn } from "@/lib/utils";

export type WeekTimedSlot = {
  key: string;
  start: number;
  end: number;
  node: ReactNode;
};

export type WeekDayColumn = {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  weekend: boolean;
  allDay: ReactNode[];
  timed: WeekTimedSlot[];
};

export function WeekTimeGrid({
  days,
  scrollHour,
}: {
  days: WeekDayColumn[];
  scrollHour: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const hasAllDay = days.some((day) => day.allDay.length > 0);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = scrollHour * WEEK_HOUR_PX;
  }, [scrollHour]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t">
      <div className="grid shrink-0 grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b">
        <div />
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "flex items-center gap-1.5 px-1.5 py-1.5",
              day.weekend && "bg-muted/30",
            )}
          >
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {day.label}
            </span>
            <span
              className={cn(
                "flex size-6 items-center justify-center text-xs tabular-nums",
                day.isToday &&
                  "rounded-full bg-foreground font-medium text-background",
              )}
            >
              {day.dayNum}
            </span>
          </div>
        ))}
      </div>
      {hasAllDay ? (
        <div className="grid shrink-0 grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b">
          <div />
          {days.map((day) => (
            <div
              key={day.date}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 p-1",
                day.weekend && "bg-muted/30",
              )}
            >
              {day.allDay}
            </div>
          ))}
        </div>
      ) : null}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]"
          style={{ height: (WEEK_DAY_MINUTES / 60) * WEEK_HOUR_PX }}
        >
          <div className="relative">
            {Array.from({ length: 24 }, (_, hour) =>
              hour === 0 ? null : (
                <span
                  key={hour}
                  className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ top: hour * WEEK_HOUR_PX }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ),
            )}
          </div>
          {days.map((day, index) => {
            const placed = placeTimedEvents(day.timed);
            return (
              <div
                key={day.date}
                className={cn(
                  "relative",
                  index < days.length - 1 && "border-r",
                  day.weekend && "bg-muted/30",
                )}
              >
                {Array.from({ length: 23 }, (_, index) => (
                  <div
                    key={index}
                    className="pointer-events-none absolute inset-x-0 border-t border-foreground/6"
                    style={{ top: (index + 1) * WEEK_HOUR_PX }}
                  />
                ))}
                {placed.map((item) => {
                  const source = day.timed.find((slot) => slot.key === item.key);
                  if (!source) return null;
                  return (
                    <div
                      key={item.key}
                      className="absolute z-10 overflow-hidden [&_a]:h-full [&_button]:flex [&_button]:h-full [&_button]:items-start [&_button]:justify-start"
                      style={{
                        top: item.top,
                        height: item.height,
                        left: `calc(${item.column} * (100% / ${item.columns}) + 2px)`,
                        width: `calc(100% / ${item.columns} - 4px)`,
                      }}
                    >
                      {source.node}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
