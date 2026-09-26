"use client";

import type { BillingInterval } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PlanInterval({
  value,
  onChange,
  label,
  month,
  year,
}: {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  label: string;
  month: string;
  year: string;
}) {
  const options = [
    ["month", month],
    ["year", year],
  ] as const;

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-[3px]"
    >
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex h-full items-center rounded-md px-2.5 text-sm font-medium transition-colors",
            value === id
              ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
