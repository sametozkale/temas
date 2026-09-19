import * as React from "react";
import { cn } from "cn";

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  size?: "sm" | "default";
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        // Quiet input: 40px touch target, bg-card, hairline border, 1px ring (docs/01 §4)
        "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-base shadow-none transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/40 md:text-sm data-[size=sm]:h-8 data-[size=sm]:py-0 data-[size=sm]:text-[13px] data-[size=sm]:md:text-[13px]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
