"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { ArrowLeft01Icon, ArrowRight01Icon, Icon } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { primaryNav, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export type SidebarWorkspace = { name: string; initials: string };
export type SidebarUser = { name: string; email?: string; initials: string };
export type SidebarShortcut = { id: string; title: string; href: string };

type SidebarProps = {
  workspace?: SidebarWorkspace;
  user?: SidebarUser;
  /** Most used properties (docs/01 §6 "Spaces"-like section). */
  shortcuts?: SidebarShortcut[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Called after navigation on mobile so the sheet can close. */
  onNavigate?: () => void;
  className?: string;
};

function isActive(pathname: string, item: NavItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Slim Granola-style sidebar: workspace switcher, primary nav, property
 * shortcuts, user block. 232px expanded / 56px collapsed (docs/01 §6).
 */
export function Sidebar({
  workspace,
  user,
  shortcuts = [],
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
}: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full flex-col gap-4 bg-sidebar px-2 py-3 text-sidebar-foreground",
        className,
      )}
    >
      {/* Workspace */}
      <div
        className={cn(
          "flex items-center gap-2 px-1.5",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
          {workspace?.initials ?? "H"}
        </span>
        {!collapsed ? (
          <span className="truncate text-sm font-medium">
            {workspace?.name ?? t("workspace_placeholder")}
          </span>
        ) : null}
      </div>

      {/* Primary nav */}
      <ul className="flex flex-col gap-0.5">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item);
          const link = (
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon icon={item.icon} size={18} className="shrink-0" />
              {!collapsed ? (
                <span className="truncate">{t(item.key)}</span>
              ) : null}
            </Link>
          );
          return (
            <li key={item.key}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{t(item.key)}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>

      {/* Property shortcuts */}
      {!collapsed && shortcuts.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="px-2 text-xs font-medium text-muted-foreground">
            {t("properties_shortcuts")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {shortcuts.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  onClick={onNavigate}
                  className="flex h-7 items-center truncate rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            aria-label={collapsed ? t("expand") : t("collapse")}
            className={cn(
              "self-end text-muted-foreground",
              collapsed && "self-center",
            )}
          >
            <Icon
              icon={collapsed ? ArrowRight01Icon : ArrowLeft01Icon}
              size={16}
            />
          </Button>
        ) : null}

        {/* User */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-1.5 py-1",
            collapsed && "justify-center px-0",
          )}
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {user?.initials ?? "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {user?.name ?? "—"}
              </p>
              {user?.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
