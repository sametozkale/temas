"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { ArrowDown01Icon, Icon } from "@/components/icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TIMEZONES } from "@/lib/timezones";
import { cn } from "@/lib/utils";

function timezoneFilter(value: string, search: string): number {
  const hay = value.toLowerCase().replace(/[_/]/g, " ");
  const query = search.toLowerCase().trim().replace(/[_/]/g, " ");
  if (!query) return 1;
  return hay.includes(query) ? 1 : 0;
}

export function TimezoneSelect({
  id,
  name,
  value,
  defaultValue = "Europe/Istanbul",
  onValueChange,
  disabled,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const selected = value ?? uncontrolled;

  const select = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
    setOpen(false);
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={selected} /> : null}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={id ? `${id}-list` : undefined}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-card py-2 pr-2 pl-3 text-left text-sm whitespace-nowrap shadow-none transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
              className,
            )}
          >
            <span className="min-w-0 truncate">{selected}</span>
            <Icon
              icon={ArrowDown01Icon}
              size={16}
              className="pointer-events-none shrink-0 text-muted-foreground"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command filter={timezoneFilter} className="rounded-lg!">
            <CommandInput placeholder={t("timezone_search")} />
            <CommandList id={id ? `${id}-list` : undefined}>
              <CommandEmpty>{t("timezone_empty")}</CommandEmpty>
              <CommandGroup>
                {TIMEZONES.map((tz) => (
                  <CommandItem
                    key={tz}
                    value={tz}
                    data-checked={tz === selected ? "true" : undefined}
                    onSelect={(current) => {
                      const match = TIMEZONES.find(
                        (item) => item.toLowerCase() === current.toLowerCase(),
                      );
                      if (match) select(match);
                    }}
                  >
                    {tz}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
