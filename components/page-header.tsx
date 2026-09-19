import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared display title for PageHeader and one-off h1s (docs/01 §3). */
export const pageTitleClassName =
  "font-serif text-xl font-medium tracking-tight text-foreground";

type PageHeaderProps = React.ComponentProps<"header"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Top-right actions. Use `variant="pill"` buttons; one primary per screen. */
  actions?: React.ReactNode;
};

/**
 * Compact serif page title on one row with actions; description underneath.
 * No divider — separation is parent spacing (docs/01 §4, §6).
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className={cn(pageTitleClassName, "min-w-0")}>{title}</h1>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}
