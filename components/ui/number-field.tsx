import * as React from "react";

import { Icon, MinusSignIcon, PlusSignIcon } from "@/components/icons";
import { cn } from "cn";

function NumberField({
  value,
  min = 0,
  max,
  step = 1,
  disabled,
  decreaseLabel,
  increaseLabel,
  onChange,
  className,
  id,
  "aria-labelledby": labelledBy,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (next: number) => void;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
}) {
  function clamp(next: number) {
    const floored = Number.isFinite(next) ? next : min;
    const capped = max == null ? floored : Math.min(max, floored);
    return Math.max(min, capped);
  }

  const atMin = value <= min;
  const atMax = max != null && value >= max;

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-lg border border-input bg-card transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) focus-within:border-ring focus-within:ring-1 focus-within:ring-ring hover:border-foreground/30",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <button
        type="button"
        className="grid h-full w-7 place-items-center text-muted-foreground outline-none hover:text-foreground disabled:text-muted-foreground/40"
        aria-label={decreaseLabel}
        disabled={disabled || atMin}
        onClick={() => onChange(clamp(value - step))}
      >
        <Icon icon={MinusSignIcon} size={16} />
      </button>
      <input
        id={id}
        aria-labelledby={labelledBy}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={Number.isFinite(value) ? value : ""}
        className="w-8 [appearance:textfield] border-0 bg-transparent text-center text-[13px] tabular-nums outline-none disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return;
          onChange(clamp(Number(raw)));
        }}
      />
      <button
        type="button"
        className="grid h-full w-7 place-items-center text-muted-foreground outline-none hover:text-foreground disabled:text-muted-foreground/40"
        aria-label={increaseLabel}
        disabled={disabled || atMax}
        onClick={() => onChange(clamp(value + step))}
      >
        <Icon icon={PlusSignIcon} size={16} />
      </button>
    </div>
  );
}

export { NumberField };
