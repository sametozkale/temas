"use client";

import { format, isValid, parseISO } from "date-fns";
import * as React from "react";
import { cn } from "cn";

import { Calendar01Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function isoFromDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function dateFromIso(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  placeholder = "Pick a date",
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const iso = value ?? internal;
  const selected = dateFromIso(iso);
  const display = selected ? format(selected, "dd.MM.yyyy") : null;

  function commit(date: Date | undefined) {
    const next = date ? isoFromDate(date) : "";
    setInternal(next);
    onValueChange?.(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name ? <input type="hidden" name={name} value={iso} /> : null}
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          aria-required={required}
          className={cn(
            "h-10 w-full justify-between rounded-lg border-input bg-card px-3 font-normal shadow-none hover:bg-card",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate tabular-nums">
            {display ?? placeholder}
          </span>
          <Icon
            icon={Calendar01Icon}
            size={16}
            className="shrink-0 text-muted-foreground/50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={commit}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  );
}
