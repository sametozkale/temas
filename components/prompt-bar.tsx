"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { AiMagicIcon, ArrowUp01Icon, Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

type PromptBarProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
  placeholder?: string;
  /** Suggestion chips shown on the right; clicking one fills the input. */
  suggestions?: string[];
  onSubmit?: (value: string) => void | Promise<void>;
  disabled?: boolean;
};

/**
 * Granola-style floating prompt input (bottom-centre on Home).
 * The only permitted shadow in the app: a 1px subtle one (docs/01 §4).
 */
export function PromptBar({
  placeholder = "Ask anything about your portfolio…",
  suggestions = [],
  onSubmit,
  disabled,
  className,
  ...props
}: PromptBarProps) {
  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    await onSubmit?.(trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full max-w-2xl items-center gap-2 rounded-full border bg-card py-1.5 pr-1.5 pl-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[max-width,box-shadow] duration-200",
        focused && "max-w-3xl border-foreground/20",
        className,
      )}
      {...props}
    >
      <Icon icon={AiMagicIcon} size={18} className="shrink-0 text-brand" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      {!value && suggestions.length > 0 ? (
        <div className="hidden items-center gap-1 sm:flex">
          {suggestions.slice(0, 2).map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="pill"
              size="xs"
              onClick={() => {
                setValue(suggestion);
                inputRef.current?.focus();
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}
      <Button
        type="submit"
        size="icon-sm"
        className="rounded-full"
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        <Icon icon={ArrowUp01Icon} size={16} />
      </Button>
    </form>
  );
}
