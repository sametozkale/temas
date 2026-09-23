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
import {
  AI_LANGUAGE_AUTO,
  AI_LANGUAGES,
  aiLanguageName,
  normalizeAiLanguage,
  type AiLanguage,
} from "@/lib/ai/languages";
import { cn } from "@/lib/utils";

function languageFilter(value: string, search: string): number {
  const hay = value.toLocaleLowerCase("en");
  const query = search.toLocaleLowerCase("en").trim();
  if (!query) return 1;
  return hay.includes(query) ? 1 : 0;
}

export function AiLanguageSelect({
  id,
  name,
  value,
  defaultValue = AI_LANGUAGE_AUTO,
  onValueChange,
  disabled,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: AiLanguage) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("settings.ai");
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState<AiLanguage>(() =>
    normalizeAiLanguage(defaultValue),
  );
  const selected =
    value !== undefined ? normalizeAiLanguage(value) : uncontrolled;

  const labelFor = React.useCallback(
    (code: AiLanguage) =>
      code === AI_LANGUAGE_AUTO ? t("language_auto") : aiLanguageName(code),
    [t],
  );

  const select = (next: AiLanguage) => {
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
            <span className="min-w-0 truncate">{labelFor(selected)}</span>
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
          <Command filter={languageFilter} className="rounded-lg!">
            <CommandInput placeholder={t("language_search")} />
            <CommandList id={id ? `${id}-list` : undefined}>
              <CommandEmpty>{t("language_empty")}</CommandEmpty>
              <CommandGroup>
                {AI_LANGUAGES.map((code) => {
                  const label = labelFor(code);
                  return (
                    <CommandItem
                      key={code}
                      value={`${label} ${code}`}
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
