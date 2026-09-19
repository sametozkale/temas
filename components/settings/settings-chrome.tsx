import type { ReactNode } from "react";
import Link from "next/link";

import { ArrowLeft01Icon, Icon, type IconSvgElement } from "@/components/icons";
import { cn } from "@/lib/utils";

import { CollapsibleSettingsItem } from "./collapsible-settings-item";

export function SettingsPage({
  title,
  actions,
  back,
  children,
}: {
  title: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header className="flex flex-col gap-3">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon icon={ArrowLeft01Icon} size={16} />
            {back.label}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            {title}
          </h1>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}

export function SettingsGroup({
  title,
  action,
  footer,
  children,
}: {
  title?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      {title || action ? (
        <div className="flex items-center justify-between gap-3 px-0.5">
          {title ? (
            <h2 className="text-sm text-muted-foreground">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">{children}</div>
      {footer ? (
        <p className="px-0.5 text-xs text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  );
}

export function SettingsItem({
  icon,
  mark,
  title,
  description,
  children,
  control = "end",
  collapsible = false,
  className,
}: {
  icon?: IconSvgElement;
  mark?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  control?: "end" | "below";
  collapsible?: boolean;
  className?: string;
}) {
  if (collapsible && icon) {
    return (
      <CollapsibleSettingsItem
        icon={icon}
        title={title}
        description={description}
        className={className}
      >
        {children}
      </CollapsibleSettingsItem>
    );
  }

  const copy = (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
  const glyph =
    mark || icon ? (
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center overflow-visible rounded-lg bg-muted",
          !mark && "text-muted-foreground",
        )}
      >
        {mark ?? (icon ? <Icon icon={icon} size={18} /> : null)}
      </span>
    ) : null;

  if (control === "below") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border bg-card p-4",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {glyph}
          {copy}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {glyph}
        {copy}
      </div>
      {children ? <div className="min-w-0 shrink-0">{children}</div> : null}
    </div>
  );
}

export function SettingsStatus({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "success";
}) {
  return (
    <span
      className={cn(
        "text-sm",
        tone === "success" ? "text-success" : "text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
