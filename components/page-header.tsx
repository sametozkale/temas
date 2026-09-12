import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = React.ComponentProps<"header"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Top-right actions. Use `variant="pill"` buttons; one primary per screen. */
  actions?: React.ReactNode;
};

/**
 * Serif page title + pill actions on the right. No divider underneath —
 * separation is done with spacing (docs/01 §4).
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 pb-6",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
