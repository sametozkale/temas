"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const items = [
  { key: "general", href: "/settings", enabled: true },
  { key: "members", href: "/settings/members", enabled: true },
  { key: "integrations", href: "/settings/integrations", enabled: true },
  { key: "notifications", href: "/settings/notifications", enabled: false },
  { key: "ai", href: "/settings/ai", enabled: true },
  { key: "templates", href: "/settings/templates", enabled: false },
] as const;

/** Underline tabs used as secondary navigation inside Settings (docs/01 §6). */
export function SettingsNav() {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="flex h-9 w-full gap-1 border-b">
      {items.map((item) => {
        const active =
          item.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(item.href);
        const className = cn(
          "relative inline-flex h-9 items-center px-3 text-sm font-medium transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
          active &&
            "after:absolute after:inset-x-3 after:-bottom-px after:h-[1.5px] after:bg-foreground",
          !item.enabled && "pointer-events-none opacity-50",
        );
        return item.enabled ? (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={className}
          >
            {t(item.key)}
          </Link>
        ) : (
          <span key={item.key} aria-disabled className={className}>
            {t(item.key)}
          </span>
        );
      })}
    </nav>
  );
}
