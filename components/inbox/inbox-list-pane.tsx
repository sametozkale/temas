"use client";

import * as React from "react";

const SCROLL_KEY = "temas-inbox-list-scroll";

/** Keeps the thread list parked when a conversation opens. */
export function InboxListPane({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const raw = sessionStorage.getItem(SCROLL_KEY);
    const top = raw ? Number(raw) : 0;
    if (!Number.isFinite(top) || top <= 0) return;
    node.scrollTop = top;
  }, []);

  return (
    <div
      ref={ref}
      data-inbox-list
      className="min-h-0 flex-1 overflow-y-auto"
      onScroll={(event) => {
        sessionStorage.setItem(
          SCROLL_KEY,
          String(event.currentTarget.scrollTop),
        );
      }}
    >
      {children}
    </div>
  );
}
