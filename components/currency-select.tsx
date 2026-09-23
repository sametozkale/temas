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
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { cn } from "@/lib/utils";

function currencyFilter(value: string, search: string): number {
  const hay = value.toLowerCase();
  const query = search.toLowerCase().trim();
  if (!query) return 1;
  return hay.includes(query) ? 1 : 0;
}

export function CurrencySelect({
  id,
  name,
  value,
  defaultValue = "TRY",
  onValueChange,
  disabled,
  className,
  ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
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
            aria-label={ariaLabel}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-card py-2 pr-2 pl-3 text-left text-sm whitespace-nowrap shadow-none transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
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
          className="w-(--radix-popover-trigger-width) min-w-56 p-0"
        >
          <Command filter={currencyFilter} className="rounded-lg!">
            <CommandInput placeholder={t("currency_search")} />
            <CommandList id={id ? `${id}-list` : undefined}>
              <CommandEmpty>{t("currency_empty")}</CommandEmpty>
              <CommandGroup>
                {CURRENCIES.map((code) => {
                  const label = currencyLabel(code);
                  return (
                    <CommandItem
                      key={code}
                      value={label}
                      data-checked={code === selected ? "true" : undefined}
                      onSelect={() => select(code)}
                    >
                      {label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
