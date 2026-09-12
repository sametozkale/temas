"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export const PROPERTY_TABS = [
  "overview",
  "inventory",
  "people",
  "files",
  "viewings",
  "applications",
  "activity",
] as const;
export type PropertyTab = (typeof PROPERTY_TABS)[number];

/** Underline tabs for the property detail page (docs/01 §4). */
export function PropertyTabs({ propertyId }: { propertyId: string }) {
  const t = useTranslations("properties.detail.tabs");
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;

  return (
    <nav
      aria-label="Property sections"
      className="-mx-1 flex h-9 w-full gap-1 overflow-x-auto border-b px-1"
    >
      {PROPERTY_TABS.map((tab) => {
        const href = `${base}/${tab}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-9 shrink-0 items-center px-3 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-[1.5px] after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
