"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  BubbleChatIcon,
  Calendar03Icon,
  CheckListIcon,
  File01Icon,
  Icon,
  InboxIcon,
  type IconSvgElement,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const ICONS = {
  viewings: Calendar03Icon,
  inbox: InboxIcon,
  tasks: CheckListIcon,
  ask: BubbleChatIcon,
  contracts: File01Icon,
} as const satisfies Record<string, IconSvgElement>;

export type ProductMenuItem = {
  id: keyof typeof ICONS;
  href: string;
  title: string;
  line: string;
};

export function ProductMenu({
  label,
  items,
}: {
  label: string;
  items: ProductMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const current = items[active] ?? items[0];

  function clearClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function show() {
    clearClose();
    setOpen(true);
  }

  function hideSoon() {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => () => clearClose(), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!current) return null;

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "flex h-8 items-center rounded-full px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onFocus={show}
        onClick={show}
      >
        {label}
      </button>
      <div
        id={panelId}
        inert={!open}
        className={cn(
          "absolute top-full left-1/2 z-50 w-[min(36rem,calc(100vw-3rem))] -translate-x-1/2 pt-3",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)_13.75rem] origin-top rounded-2xl border border-foreground/8 bg-card p-2 shadow-[0_24px_50px_-28px_rgb(28_27_25/0.45)] transition duration-200 ease-out motion-reduce:transition-none",
            open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          <ul className="flex flex-col gap-0.5 p-1">
            {items.map((item, index) => {
              const selected = index === active;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                      selected
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => {
                      setActive(index);
                      show();
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                        selected
                          ? "bg-brand-soft text-brand"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon icon={ICONS[item.id]} size={16} />
                    </span>
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col justify-between rounded-xl bg-secondary p-5">
            <p className="text-xs text-muted-foreground">{current.title}</p>
            <p className="font-serif text-xl leading-snug font-normal tracking-tight text-balance">
              {current.line}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
