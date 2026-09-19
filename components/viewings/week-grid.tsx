"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_END_MIN,
  DEFAULT_START_MIN,
  WEEKDAYS,
  type WeekCell,
} from "@/lib/viewings/week";
import { minutesToTime, parseTimeToMinutes } from "@/lib/slots";
import { cn } from "@/lib/utils";

export function WeekGrid({
  value,
  onChange,
  disabled,
}: {
  value: WeekCell[];
  onChange: (next: WeekCell[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("viewings.weekdays");

  function patch(day: (typeof WEEKDAYS)[number], next: Partial<WeekCell>) {
    onChange(
      value.map((cell) => (cell.weekday === day ? { ...cell, ...next } : cell)),
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {WEEKDAYS.map((day) => {
        const cell = value.find((c) => c.weekday === day) ?? {
          weekday: day,
          enabled: false,
          startMin: DEFAULT_START_MIN,
          endMin: DEFAULT_END_MIN,
        };
        return (
          <div
            key={day}
            className={cn(
              "flex flex-wrap items-center gap-3 px-4 py-3",
              !cell.enabled && "bg-secondary/40",
            )}
          >
            <Switch
              checked={cell.enabled}
              disabled={disabled}
              onCheckedChange={(v) => patch(day, { enabled: v === true })}
              aria-label={t(day)}
            />
            <span className="w-20 text-sm font-medium">{t(day)}</span>
            <Input
              type="time"
              className="min-w-0 flex-1 sm:w-32 sm:flex-none"
              disabled={disabled || !cell.enabled}
              value={minutesToTime(cell.startMin)}
              onChange={(e) =>
                patch(day, { startMin: parseTimeToMinutes(e.target.value) })
              }
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="time"
              className="min-w-0 flex-1 sm:w-32 sm:flex-none"
              disabled={disabled || !cell.enabled}
              value={minutesToTime(cell.endMin)}
              onChange={(e) =>
                patch(day, { endMin: parseTimeToMinutes(e.target.value) })
              }
            />
          </div>
        );
      })}
    </div>
  );
}
