import * as React from "react";

import { Icon, type IconSvgElement } from "@/components/icons";
import { cn } from "@/lib/utils";

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon?: IconSvgElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A single ghost/soft CTA. No illustrations. */
  action?: React.ReactNode;
};

/** Icon + one line of text + one quiet CTA (docs/01 §4). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon icon={icon} size={18} />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
