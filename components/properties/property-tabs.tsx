"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export const PROPERTY_TAB_GROUPS = [
  { id: "listing", tabs: ["overview"] },
  { id: "letting", tabs: ["viewings", "applications", "pipeline"] },
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
  Record<
    Exclude<
      PropertyTab,
      "overview" | "activity" | "people" | "files" | "applications"
    >,
    number
  >
>;

/** Pill segmented control for the property record (docs/01 §4). */
export function PropertyTabs({
  propertyId,
  counts = {},
}: {
  propertyId: string;
  counts?: PropertyTabCounts;
}) {
  const t = useTranslations("properties.detail.tabs");
  const tDetail = useTranslations("properties.detail");
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;

  return (
    <nav aria-label={tDetail("tabs_label")} className="shrink-0 px-4 pt-5 pb-1">
      <div className="inline-flex h-8 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-[3px]">
        {PROPERTY_TABS.map((tab) => {
          const href = `${base}/${tab}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count =
            tab === "people" || tab === "files"
              ? undefined
              : counts[tab as keyof PropertyTabCounts];
          return (
            <Link
              key={tab}
              href={href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-full shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
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
    </nav>
  );
}
