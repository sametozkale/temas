"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import {
  Icon,
  LayoutGridIcon,
  LayoutListIcon,
  Search01Icon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/db/schema/properties";
import { cn } from "@/lib/utils";

export type PropertiesView = "grid" | "list";

const ALL = "all";

/**
 * URL-driven filters (RSC re-renders on change). Search is debounced so the
 * server is not hit on every keystroke.
 */
export function PropertiesToolbar({
  view,
  hasFilters,
}: {
  view: PropertiesView;
  hasFilters: boolean;
}) {
  const t = useTranslations("properties");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [, startTransition] = React.useTransition();

  const update = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === ALL) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const handle = setTimeout(() => update({ q }), 250);
    return () => clearTimeout(handle);
  }, [q, params, update]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Icon
          icon={Search01Icon}
          size={16}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search_placeholder")}
          className="pl-8"
          aria-label={t("search_placeholder")}
        />
      </div>

      <Select
        value={params.get("type") ?? ALL}
        onValueChange={(v) => update({ type: v })}
      >
        <SelectTrigger className="w-[150px]" aria-label={t("col_type")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filter_type_all")}</SelectItem>
          {PROPERTY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {t(`types.${type}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("status") ?? ALL}
        onValueChange={(v) => update({ status: v })}
      >
        <SelectTrigger className="w-[190px]" aria-label={t("col_status")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filter_status_all")}</SelectItem>
          <SelectItem value="listed">{t("filter_status_listed")}</SelectItem>
          {PROPERTY_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            update({ q: null, type: null, status: null });
          }}
        >
          {t("clear_filters")}
        </Button>
      ) : null}

      <div
        role="group"
        aria-label="View"
        className="ml-auto inline-flex rounded-md border p-0.5"
      >
        <ViewToggle
          active={view === "grid"}
          label={t("view_grid")}
          icon={LayoutGridIcon}
          onClick={() => update({ view: null })}
        />
        <ViewToggle
          active={view === "list"}
          label={t("view_list")}
          icon={LayoutListIcon}
          onClick={() => update({ view: "list" })}
        />
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentProps<typeof Icon>["icon"];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-[6px] transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon icon={icon} size={16} />
    </button>
  );
}
