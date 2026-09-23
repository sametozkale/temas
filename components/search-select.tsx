"use client";

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
import { cn } from "@/lib/utils";

function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function optionFilter(value: string, search: string): number {
  const query = fold(search).trim();
  if (!query) return 1;
  return fold(value).includes(query) ? 1 : 0;
}

export function SearchSelect({
  id,
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = value.trim();

  return (
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
          <span
            className={cn(
              "min-w-0 truncate",
              !selected && "text-muted-foreground",
            )}
          >
            {selected || placeholder}
          </span>
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
        <Command filter={optionFilter} className="rounded-lg!">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList id={id ? `${id}-list` : undefined}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  data-checked={option === selected ? "true" : undefined}
                  onSelect={() => {
                    onValueChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
