"use client";

import * as React from "react";
import { cn } from "cn";

import { Clock01Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUARTER_HOURS = Array.from({ length: 24 * 4 }, (_, index) => {
  const minutes = index * 15;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
});

export function TimePicker({
  value,
  onValueChange,
  disabled,
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedRef = React.useRef<HTMLButtonElement>(null);
  const options = QUARTER_HOURS.includes(value)
    ? QUARTER_HOURS
    : [...QUARTER_HOURS, value].sort();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-8 w-[7.25rem] justify-between rounded-lg border-input bg-card px-3 font-normal shadow-none hover:bg-card enabled:hover:border-foreground/30",
            className,
          )}
        >
          <span className="tabular-nums">{value}</span>
          <Icon
            icon={Clock01Icon}
            size={16}
            className="shrink-0 text-muted-foreground/50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[7.25rem] gap-0 p-1"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          selectedRef.current?.scrollIntoView({ block: "center" });
        }}
      >
        <div className="max-h-56 overflow-y-auto">
          {options.map((time) => {
            const selected = time === value;
            return (
              <button
                key={time}
                type="button"
                ref={selected ? selectedRef : undefined}
                aria-pressed={selected}
                className={cn(
                  "flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] tabular-nums",
                  selected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted",
                )}
                onClick={() => {
                  onValueChange(time);
                  setOpen(false);
                }}
              >
                {time}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
