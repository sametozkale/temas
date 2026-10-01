import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Quiet textarea: bg-card, hairline border, 1px ring on focus (docs/01 §4)
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-base shadow-none transition-[background-color,border-color,color,box-shadow] duration-(--duration-quick) ease-(--ease-smooth-out) outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring enabled:hover:border-foreground/30 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/40 aria-invalid:hover:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
