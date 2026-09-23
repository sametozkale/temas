"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Icon, Menu01Icon } from "@/components/icons";
import { isPropertyRecordPath } from "@/components/properties/property-tabs";
import {
  Sidebar,
  type SidebarMembership,
  type SidebarShortcut,
  type SidebarUser,
  type SidebarWorkspace,
} from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { readLocalPreference, writeLocalPreference } from "@/lib/ui-preference";

const SIDEBAR_WIDTH_MOTION =
  "transition-[width] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none";

type AppShellProps = {
  workspace?: SidebarWorkspace;
  user?: SidebarUser;
  workspaces?: SidebarMembership[];
  chats?: SidebarShortcut[];
  inboxUnread?: number;
  children: React.ReactNode;
};

/**
 * AppShell (docs/01 §6): paper canvas, slim sidebar on ≥lg, white rounded
 * body panel. Content is centred at max-width 1080px; Inbox and the
 * property record are full-bleed. Calendar fills the panel height.
 */
export function AppShell({
  workspace,
  user,
  workspaces,
  chats,
  inboxUnread = 0,
  children,
}: AppShellProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const fullBleed = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const homeCanvas = pathname === "/home";
  const wizardCanvas = pathname === "/properties/new";
  const propertyRecord = isPropertyRecordPath(pathname);
  const calendarCanvas = pathname === "/calendar";
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [animateWidth, setAnimateWidth] = React.useState(false);

  React.useLayoutEffect(() => {
    try {
      setCollapsed(readLocalPreference("sidebar-collapsed") === "1");
    } catch {
      // ignore storage errors (private mode etc.)
    }
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setAnimateWidth(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      writeLocalPreference("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const sidebarProps = {
    workspace,
    user,
    workspaces,
    chats,
    inboxUnread,
  };

  return (
    <div className="flex h-svh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-svh shrink-0 overflow-hidden lg:block",
          animateWidth && SIDEBAR_WIDTH_MOTION,
          collapsed ? "w-[42px]" : "w-[232px]",
        )}
      >
        <div className="flex h-full w-[232px] flex-col">
          <Sidebar
            {...sidebarProps}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-12 shrink-0 items-center gap-2 px-3 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("open_menu")}
              >
                <Icon icon={Menu01Icon} size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[232px] p-0"
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">{t("open_menu")}</SheetTitle>
              <Sidebar
                {...sidebarProps}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium">
            {workspace?.name ?? t("workspace_placeholder")}
          </span>
        </header>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col p-2",
            animateWidth &&
              "transition-[padding] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            !collapsed && "lg:pl-0",
          )}
        >
          <main className="@container relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-foreground/6 bg-card">
            <div
              className={cn(
                "flex min-h-0 w-full flex-1 flex-col",
                fullBleed || propertyRecord
                  ? "overflow-hidden"
                  : homeCanvas
                    ? "mx-auto max-w-[1080px] overflow-auto px-6 pt-6 pb-2"
                    : wizardCanvas
                      ? "mx-auto max-w-[1080px] overflow-hidden px-6 pt-6 pb-6"
                      : calendarCanvas
                        ? "mx-auto max-w-[1080px] overflow-hidden px-6 pt-6 pb-4"
                        : "mx-auto max-w-[1080px] overflow-auto px-6 pt-6 pb-8",
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
