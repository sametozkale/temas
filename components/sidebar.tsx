"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";

import { FeedbackDialog } from "@/components/feedback-dialog";
import {
  ArrowDown01Icon,
  Icon,
  PlusSignIcon,
  Settings02Icon,
  SidebarLeftIcon,
} from "@/components/icons";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { primaryNav, type NavItem } from "@/lib/navigation";
import { readLocalPreference, writeLocalPreference } from "@/lib/ui-preference";
import { cn } from "@/lib/utils";

export type SidebarWorkspace = {
  id?: string;
  name: string;
  initials: string;
  timezone?: string;
  imageUrl?: string | null;
};
export type SidebarUser = {
  name: string;
  email?: string;
  initials: string;
  imageUrl?: string | null;
};
export type SidebarShortcut = { id: string; title: string; href: string };
export type SidebarMembership = {
  id: string;
  name: string;
  role: string;
  imageUrl?: string | null;
};

type SidebarProps = {
  workspace?: SidebarWorkspace;
  user?: SidebarUser;
  /** All memberships for the switcher. */
  workspaces?: SidebarMembership[];
  /** Recent AI threads (ChatGPT-style chat history). */
  chats?: SidebarShortcut[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Called after navigation on mobile so the sheet can close. */
  onNavigate?: () => void;
  className?: string;
  inboxUnread?: number;
};

function isActive(pathname: string, item: NavItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const CHAT_STAGGER_MS = 32;
const CHAT_STAGGER_CAP = 11;

function ChatList({
  chats,
  activeThread,
  onNavigate,
  reveal = 0,
  hidden = false,
}: {
  chats: SidebarShortcut[];
  activeThread: string | null;
  onNavigate?: () => void;
  reveal?: number;
  hidden?: boolean;
}) {
  if (chats.length === 0) return null;

  const playing = reveal > 0 && !hidden;

  return (
    <ul className="flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto">
      {chats.map((chat, index) => {
        const active = activeThread === chat.id;
        return (
          <li
            key={`${chat.id}-${reveal}`}
            className={cn(
              playing && "animate-sidebar-chat-in motion-reduce:animate-none",
              hidden && !playing && "opacity-0",
            )}
            style={
              playing
                ? {
                    animationDelay: `${Math.min(index, CHAT_STAGGER_CAP) * CHAT_STAGGER_MS}ms`,
                  }
                : undefined
            }
          >
            <Link
              href={chat.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-7 items-center truncate rounded-md px-2 text-[13px] transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              {chat.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ChatHistory({
  chats,
  onNavigate,
  reveal,
  hidden,
}: {
  chats: SidebarShortcut[];
  onNavigate?: () => void;
  reveal?: number;
  hidden?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeThread =
    pathname === "/home" ? (searchParams.get("thread") ?? null) : null;

  return (
    <ChatList
      chats={chats}
      activeThread={activeThread}
      onNavigate={onNavigate}
      reveal={reveal}
      hidden={hidden}
    />
  );
}

function ChatSection({
  chats,
  onNavigate,
  dimmed,
}: {
  chats: SidebarShortcut[];
  onNavigate?: () => void;
  dimmed?: boolean;
}) {
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);
  const [reveal, setReveal] = useState(0);
  const primed = useRef(false);
  const wasHidden = useRef(true);

  useLayoutEffect(() => {
    try {
      setCollapsed(readLocalPreference("chats-collapsed") === "1");
    } catch {
      // ignore storage errors (private mode etc.)
    }
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setCanAnimate(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const hidden = Boolean(dimmed) || collapsed;

  useEffect(() => {
    if (!canAnimate) return;
    if (!primed.current) {
      primed.current = true;
      wasHidden.current = hidden;
      return;
    }
    if (!hidden && wasHidden.current) {
      setReveal((n) => n + 1);
    }
    wasHidden.current = hidden;
  }, [canAnimate, hidden]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        writeLocalPreference("chats-collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const newChatLink = (
    <Link
      href="/home"
      onClick={onNavigate}
      aria-label={t("new_chat")}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent/60",
        dimmed
          ? "h-8 w-fit px-2 text-muted-foreground hover:text-foreground"
          : "size-7 text-secondary-foreground",
      )}
    >
      <Icon icon={PlusSignIcon} size={dimmed ? 18 : 16} />
    </Link>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <div className={cn("flex items-center gap-0.5", dimmed ? "h-8" : "h-7")}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="sidebar-chats"
          title={collapsed ? t("expand_chats") : t("collapse_chats")}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 text-xs font-medium text-secondary-foreground transition-colors",
            dimmed && "hidden",
          )}
        >
          <span className="truncate">{t("chats")}</span>
          <span
            className={cn(
              "inline-flex shrink-0 transition-transform duration-150",
              collapsed && "-rotate-90",
            )}
          >
            <Icon icon={ArrowDown01Icon} size={16} />
          </span>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>{newChatLink}</TooltipTrigger>
          <TooltipContent side={dimmed ? "right" : "top"}>
            {t("new_chat")}
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        id="sidebar-chats"
        className={cn(
          "grid min-h-0 transition-[grid-template-rows] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          collapsed ? "grid-rows-[0fr]" : "flex-1 grid-rows-[1fr]",
          dimmed && "pointer-events-none",
        )}
        aria-hidden={collapsed || dimmed}
      >
        <div className="min-h-0 overflow-hidden">
          <Suspense
            fallback={
              <ChatList
                chats={chats}
                activeThread={null}
                onNavigate={onNavigate}
                reveal={reveal}
                hidden={hidden}
              />
            }
          >
            <ChatHistory
              chats={chats}
              onNavigate={onNavigate}
              reveal={reveal}
              hidden={hidden}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * Slim Granola-style sidebar: workspace switcher, primary nav, chat
 * history, user block. 232px expanded / 42px collapsed (docs/01 §6).
 */
export function Sidebar({
  workspace,
  user,
  workspaces,
  chats = [],
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
  inboxUnread = 0,
}: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const settingsMode = pathname.startsWith("/settings");

  const collapseControl = onToggleCollapse ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t("expand") : t("collapse")}
          className={cn(
            "shrink-0 text-muted-foreground/50 hover:text-foreground",
            collapsed &&
              "absolute inset-0 z-10 size-full rounded-md bg-muted opacity-0 transition-opacity duration-150 group-hover/collapse:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Icon icon={SidebarLeftIcon} size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? "right" : "bottom"}>
        {collapsed ? t("expand") : t("collapse")}
      </TooltipContent>
    </Tooltip>
  ) : null;

  if (settingsMode) {
    return (
      <nav
        aria-label={t("settings")}
        data-collapsed={collapsed}
        className={cn(
          "flex h-full flex-col bg-sidebar px-2 py-3 text-sidebar-foreground",
          className,
        )}
      >
        <SettingsNav
          collapsed={collapsed}
          onNavigate={onNavigate}
          headerAction={collapseControl}
          showBilling={
            workspaces?.some(
              (item) => item.id === workspace?.id && item.role === "owner",
            ) ?? false
          }
        />
      </nav>
    );
  }

  return (
    <nav
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full min-h-0 flex-col gap-4 bg-sidebar px-2 py-3 text-sidebar-foreground",
        className,
      )}
    >
      {/* Workspace switcher */}
      <div className="relative flex items-center gap-1">
        <WorkspaceSwitcher
          workspace={workspace}
          workspaces={workspaces}
          collapsed={collapsed}
          defaultTimezone={workspace?.timezone}
          onNavigate={onNavigate}
        />
        {collapsed ? (
          <div className="group/collapse absolute top-0 left-1 z-10 size-7">
            {collapseControl}
          </div>
        ) : (
          collapseControl
        )}
      </div>

      {/* Primary nav */}
      <ul className="flex flex-col gap-0.5">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item);
          const link = (
            <Link
              href={item.href}
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
              <Icon
                icon={active && item.activeIcon ? item.activeIcon : item.icon}
                size={18}
                className="shrink-0"
              />
              <span className={cn("truncate", collapsed && "hidden")}>
                {t(item.key)}
              </span>
              {item.key === "inbox" && inboxUnread > 0 ? (
                <span
                  className={cn(
                    "ml-auto rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground",
                    collapsed && "hidden",
                  )}
                >
                  {inboxUnread > 99 ? "99+" : inboxUnread}
                </span>
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

      {/* Chats stay in layout so the rail clips instead of jumping. */}
      <ChatSection chats={chats} onNavigate={onNavigate} dimmed={collapsed} />

      <div className="mt-auto flex flex-col gap-1.5">
        <div
          className={cn(
            "flex items-center gap-0.5 px-1.5",
            collapsed && "flex-col items-start",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                onClick={onNavigate}
                aria-label={t("settings")}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
              >
                <Icon icon={Settings02Icon} size={16} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"}>
              {t("settings")}
            </TooltipContent>
          </Tooltip>
          <FeedbackDialog collapsed={collapsed} />
        </div>
        <div className="px-1.5">
          <Separator className="bg-sidebar-border/40" />
        </div>
        {user ? (
          <div className={cn("min-w-0", collapsed && "px-1.5")}>
            <UserMenu user={user} collapsed={collapsed} />
          </div>
        ) : null}
      </div>
    </nav>
  );
}
