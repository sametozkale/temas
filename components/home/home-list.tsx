import Link from "next/link";
import type { ReactNode } from "react";

export function HomeSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function HomeRow({
  href,
  title,
  meta,
  trailing,
}: {
  href: string;
  title: string;
  meta?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 py-2 text-sm transition-colors hover:text-foreground"
      >
        <span className="min-w-0 truncate font-medium">{title}</span>
        {meta ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {meta}
          </span>
        ) : null}
      </Link>
      {trailing}
    </div>
  );
}
