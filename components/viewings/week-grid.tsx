"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import {
  DEFAULT_END_MIN,
  DEFAULT_START_MIN,
  WEEKDAYS,
  type WeekCell,
} from "@/lib/viewings/week";
import { minutesToTime, parseTimeToMinutes } from "@/lib/slots";

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
  const tViewings = useTranslations("viewings");

  function patch(day: (typeof WEEKDAYS)[number], next: Partial<WeekCell>) {
    onChange(
      value.map((cell) => (cell.weekday === day ? { ...cell, ...next } : cell)),
    );
  }

  return (
    <div className="divide-y">
      {WEEKDAYS.map((day) => {
        const cell = value.find((c) => c.weekday === day) ?? {
          weekday: day,
          enabled: false,
          startMin: DEFAULT_START_MIN,
          endMin: DEFAULT_END_MIN,
        };
        return (
          <div key={day} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="w-10 text-sm font-medium">{t(day)}</span>
            <Switch
              checked={cell.enabled}
              disabled={disabled}
              onCheckedChange={(v) => patch(day, { enabled: v === true })}
              aria-label={t(day)}
            />
            {cell.enabled ? (
              <>
                <TimePicker
                  ariaLabel={tViewings("start_time")}
                  disabled={disabled}
                  value={minutesToTime(cell.startMin)}
                  onValueChange={(next) =>
                    patch(day, { startMin: parseTimeToMinutes(next) })
                  }
                />
                <span className="text-xs text-muted-foreground">–</span>
                <TimePicker
                  ariaLabel={tViewings("end_time")}
                  disabled={disabled}
                  value={minutesToTime(cell.endMin)}
                  onValueChange={(next) =>
                    patch(day, { endMin: parseTimeToMinutes(next) })
                  }
                />
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                {tViewings("unavailable")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
