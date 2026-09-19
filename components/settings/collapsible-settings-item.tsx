"use client";

import type { ReactNode } from "react";
import * as React from "react";

import { ArrowDown01Icon, Icon, type IconSvgElement } from "@/components/icons";
import { cn } from "@/lib/utils";

export function CollapsibleSettingsItem({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: IconSvgElement;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-lg text-left outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon icon={icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        >
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      {open ? children : null}
    </div>
  );
}
