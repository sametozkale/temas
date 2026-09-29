import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Icon, type IconSvgElement } from "@/components/icons";
import { cn } from "@/lib/utils";

import type { WalkthroughStep } from "../feature-walkthrough";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-foreground/6 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A skeleton line standing in for copy the screen does not need to spell out. */
export function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-2 rounded-full bg-muted", className)} />;
}

/** A card with a quiet title row, like a page inside the app. */
export function Window({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex h-11 items-center justify-between gap-3 border-b border-foreground/6 px-4">
        <span className="truncate text-sm font-medium">{title}</span>
        {aside}
      </div>
      {children}
    </Card>
  );
}

/** A phone outline for what the tenant or the applicant sees on their side. */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[18.5rem] rounded-[2rem] border border-foreground/10 bg-card p-2.5 shadow-[0_18px_40px_-24px_rgb(28_27_25/0.35)]",
        className,
      )}
    >
      <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-foreground/10" />
      <div className="overflow-hidden rounded-[1.5rem] bg-background">{children}</div>
    </div>
  );
}

export function Bubble({
  side,
  children,
  className,
}: {
  side: "in" | "out";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
        side === "in"
          ? "bg-secondary"
          : "ml-auto bg-brand-soft text-brand-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A workspace record rendered as a named chip, the way Ask and the inbox show it. */
export function RecordChip({ icon, children }: { icon: IconSvgElement; children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-foreground/10 bg-card px-1.5 py-[3px] align-middle text-xs leading-none text-foreground">
      <Icon icon={icon} size={16} className="size-3.5 text-muted-foreground" />
      {children}
    </span>
  );
}

export function Initials({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Check({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
        on ? "border-foreground bg-foreground text-background" : "border-foreground/20 bg-card",
      )}
    >
      {on ? (
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden>
          <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-7 shrink-0 items-center rounded-full p-0.5",
        on ? "justify-end bg-brand" : "justify-start bg-foreground/15",
      )}
    >
      <span className="size-3 rounded-full bg-card" />
    </span>
  );
}

/** Reads `steps.s1…sN` for a feature page and pairs each step with its screen. */
export async function buildSteps(
  page: string,
  screens: ReactNode[],
): Promise<WalkthroughStep[]> {
  const [t, shared] = await Promise.all([
    getTranslations(`marketing.features.${page}.steps`),
    getTranslations("marketing.features"),
  ]);
  return screens.map((screen, index) => {
    const key = `s${index + 1}`;
    return {
      label: shared("step", { n: index + 1 }),
      title: t(`${key}.title`),
      body: t(`${key}.body`),
      screen,
    };
  });
}
