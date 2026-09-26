"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { signOut } from "@/app/(auth)/actions";
import {
  AiMagicIcon,
  ArrowLeft01Icon,
  CustomerSupportIcon,
  Building03Icon,
  File01Icon,
  Icon,
  Link01Icon,
  Logout01Icon,
  Money01Icon,
  Notification01Icon,
  UserGroupIcon,
  UserIcon,
  type IconSvgElement,
} from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SettingsItem = {
  key:
    | "profile"
    | "notifications"
    | "ai"
    | "support"
    | "general"
    | "members"
    | "integrations"
    | "templates"
    | "billing";
  href: string;
  icon: IconSvgElement;
};

const ACCOUNT_ITEMS: SettingsItem[] = [
  { key: "profile", href: "/settings", icon: UserIcon },
  {
    key: "notifications",
    href: "/settings/notifications",
    icon: Notification01Icon,
  },
  { key: "ai", href: "/settings/ai", icon: AiMagicIcon },
  { key: "support", href: "/settings/support", icon: CustomerSupportIcon },
];

const WORKSPACE_ITEMS: SettingsItem[] = [
  { key: "general", href: "/settings/workspace", icon: Building03Icon },
  { key: "members", href: "/settings/members", icon: UserGroupIcon },
  { key: "integrations", href: "/settings/integrations", icon: Link01Icon },
  { key: "templates", href: "/settings/templates", icon: File01Icon },
  { key: "billing", href: "/settings/billing", icon: Money01Icon },
];

function isActive(pathname: string, href: string) {
  return href === "/settings"
    ? pathname === "/settings"
    : pathname.startsWith(href);
}

/**
 * Granola-style settings rail: back to the app, grouped links, sign out
 * pinned to the bottom. Used as the app sidebar while on /settings/*.
 */
export function SettingsNav({
  collapsed = false,
  onNavigate,
  headerAction,
  showBilling = false,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  headerAction?: React.ReactNode;
  showBilling?: boolean;
}) {
  const t = useTranslations("settings.nav");
  const tn = useTranslations("nav");
  const pathname = usePathname();
  const workspaceItems = showBilling
    ? WORKSPACE_ITEMS
    : WORKSPACE_ITEMS.filter((item) => item.key !== "billing");

  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <NavRow
            href="/home"
            label={t("back")}
            icon={ArrowLeft01Icon}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>
        {collapsed ? (
          <div className="group/collapse absolute top-0 left-[3px] z-10 size-7">
            {headerAction}
          </div>
        ) : (
          headerAction
        )}
      </div>

      <div className="flex flex-col gap-6">
        <NavGroup
          label={t("account")}
          items={ACCOUNT_ITEMS}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavGroup
          label={t("workspace")}
          items={workspaceItems}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
          className={cn(
            "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50",
            collapsed && "w-fit overflow-hidden hover:bg-destructive/10",
          )}
        >
          <Icon icon={Logout01Icon} size={18} className="shrink-0" />
          <span className={cn(collapsed && "hidden")}>{tn("sign_out")}</span>
        </button>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  label?: string;
  items: readonly SettingsItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("settings.nav");

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <p
          className={cn(
            "px-2 text-xs font-medium text-muted-foreground/50",
            collapsed && "hidden",
          )}
        >
          {label}
        </p>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.key}>
            <NavRow
              href={item.href}
              label={t(item.key)}
              icon={item.icon}
              collapsed={collapsed}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NavRow({
  href,
  label,
  icon,
  collapsed,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: IconSvgElement;
  collapsed: boolean;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
        collapsed && "w-fit overflow-hidden",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <Icon icon={icon} size={18} className="shrink-0" />
      <span className={cn("truncate", collapsed && "hidden")}>{label}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
