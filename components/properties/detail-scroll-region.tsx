"use client";

import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Shared scroll chrome for property detail rail + tab body (docs/01 §4 scrollbars). */
export function DetailScrollRegion({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className={cn("px-5 py-5", innerClassName)}>{children}</div>
    </ScrollArea>
  );
}
