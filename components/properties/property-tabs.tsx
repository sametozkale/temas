"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export const PROPERTY_TAB_GROUPS = [
  { id: "listing", tabs: ["overview"] },
  { id: "letting", tabs: ["viewings", "applications"] },
  { id: "record", tabs: ["people", "files", "inventory"] },
  { id: "history", tabs: ["activity"] },
] as const;

export const PROPERTY_TABS = PROPERTY_TAB_GROUPS.flatMap((group) => group.tabs);
export type PropertyTab = (typeof PROPERTY_TABS)[number];

const PROPERTY_TAB_RE = new RegExp(
  `^/properties/[^/]+/(${PROPERTY_TABS.join("|")}|map)(?:/|$)`,
);

/** Record tabs (not list, new, edit, or contracts). */
export function isPropertyRecordPath(pathname: string) {
  return PROPERTY_TAB_RE.test(pathname);
}

export type PropertyTabCounts = Partial<
  Record<Exclude<PropertyTab, "overview" | "activity">, number>
>;

/** Grouped underline tabs for the property record (docs/01 §4, §6). */
export function PropertyTabs({
  propertyId,
  counts = {},
}: {
  propertyId: string;
  counts?: PropertyTabCounts;
}) {
  const t = useTranslations("properties.detail.tabs");
  const tGroups = useTranslations("properties.detail.groups");
  const tDetail = useTranslations("properties.detail");
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;

  return (
    <nav
      aria-label={tDetail("tabs_label")}
      className="-mx-4 shrink-0 border-b bg-card px-4 md:-mx-8 md:px-8"
    >
      <div className="flex items-end gap-6 overflow-x-auto">
        {PROPERTY_TAB_GROUPS.map((group) => (
          <div
            key={group.id}
            role="group"
            aria-label={tGroups(group.id)}
            className="flex min-w-0 flex-col"
          >
            <p className="px-2.5 text-[11px] leading-4 text-muted-foreground/50">
              {tGroups(group.id)}
            </p>
            <div className="flex">
              {group.tabs.map((tab) => {
                const href = `${base}/${tab}`;
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                const count = counts[tab as keyof PropertyTabCounts];
                return (
                  <Link
                    key={tab}
                    href={href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                      active
                        ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-[1.5px] after:bg-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(tab)}
                    {count ? (
                      <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
