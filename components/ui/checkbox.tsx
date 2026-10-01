"use client";

import * as React from "react";
import { cn } from "cn";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Icon, Tick02Icon } from "@/components/icons";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "t-check peer relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-foreground/15 outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-foreground/15 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:not-data-checked:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:hover:border-destructive aria-invalid:aria-checked:border-primary data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand data-[state=indeterminate]:text-primary-foreground group-has-[:focus-visible]/field-label:data-[state=indeterminate]:border-brand data-[state=indeterminate]:enabled:hover:border-brand/75 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:data-[state=indeterminate]:bg-brand data-checked:border-brand data-checked:bg-brand data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-brand data-checked:enabled:hover:border-brand/75 dark:data-checked:bg-brand",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        forceMount
        className="grid place-content-center text-current [&>svg]:size-3"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="checkbox-mixed absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2"
          fill="none"
        >
          <path
            d="M6 12H18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <Icon
          icon={Tick02Icon}
          size={16}
          strokeWidth={2}
          className="checkbox-mark size-3"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
