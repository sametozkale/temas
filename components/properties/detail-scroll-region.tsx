"use client";

import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Shared scroll chrome for property detail rail + tab body (docs/01 §4 scrollbars). */
export function DetailScrollRegion({
  children,
  className,
  innerClassName,
  inset = "px-4 py-5",
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** Horizontal inset. The tab body uses the tab bar's 16px; the rail stays 20px. */
  inset?: string;
}) {
  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className={cn(inset, innerClassName)}>{children}</div>
    </ScrollArea>
  );
}
