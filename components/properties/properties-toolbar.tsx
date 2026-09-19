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

export type PropertiesView = "grid" | "list";

const ALL = "all";

/**
 * URL-driven filters (RSC re-renders on change). Search is debounced so the
 * server is not hit on every keystroke.
 */
export function PropertiesToolbar({
  view,
  hasFilters,
  agents = [],
  currentUserId,
}: {
  view: PropertiesView;
  hasFilters: boolean;
  agents?: { userId: string; name: string }[];
  currentUserId?: string;
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
    <div className="flex flex-nowrap items-center gap-2">
      <div className="relative min-w-0 w-[200px] shrink">
        <Icon
          icon={Search01Icon}
          size={16}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          size="sm"
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
        <SelectTrigger
          size="sm"
          className="w-[150px] shrink-0"
          aria-label={t("col_type")}
        >
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
        <SelectTrigger
          size="sm"
          className="w-[190px] shrink-0"
          aria-label={t("col_status")}
        >
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

      {agents.length > 0 ? (
        <Select
          value={params.get("agent") ?? ALL}
          onValueChange={(v) => update({ agent: v })}
        >
          <SelectTrigger
            size="sm"
            className="w-[180px] shrink-0"
            aria-label={t("filter_agent")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filter_agent_all")}</SelectItem>
            {currentUserId ? (
              <SelectItem value="me">{t("filter_agent_mine")}</SelectItem>
            ) : null}
            {agents.map((agent) => (
              <SelectItem key={agent.userId} value={agent.userId}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {hasFilters ? (
        <Button
          variant="ghost"
          onClick={() => {
            setQ("");
            update({ q: null, type: null, status: null, agent: null });
          }}
        >
          {t("clear_filters")}
        </Button>
      ) : null}

      <div
        role="group"
        aria-label={t("view_group")}
        className="ml-auto inline-flex h-8 shrink-0 items-stretch rounded-full border p-0.5"
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
    <Button
      type="button"
      size="icon-xs"
      variant={active ? "secondary" : "ghost"}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="h-full w-auto min-w-0 aspect-square"
    >
      <Icon icon={icon} size={16} />
    </Button>
  );
}
