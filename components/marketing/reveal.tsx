import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-in motion that does not hide content.
 *
 * The previous version rendered `opacity-0` until an IntersectionObserver
 * ran after hydration, so on a slow connection the page stayed blank until
 * the client bundle arrived. The animation is CSS-only (`animation-timeline:
 * view()` where supported) and only translates — text and the product mock
 * paint with the HTML.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("reveal", className)}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
