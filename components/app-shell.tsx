"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Icon, Menu01Icon } from "@/components/icons";
import {
  Sidebar,
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
import type { UserMenuWorkspace } from "@/components/user-menu";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "havn:sidebar-collapsed";

type AppShellProps = {
  workspace?: SidebarWorkspace;
  user?: SidebarUser;
  workspaces?: UserMenuWorkspace[];
  shortcuts?: SidebarShortcut[];
  inboxUnread?: number;
  children: React.ReactNode;
};

/**
 * AppShell (docs/01 §6): fixed slim sidebar on ≥lg, sheet on smaller screens,
 * content centred at max-width 1080px. No top bar by default.
 */
export function AppShell({
  workspace,
  user,
  workspaces,
  shortcuts,
  inboxUnread = 0,
  children,
}: AppShellProps) {
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore storage errors (private mode etc.)
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const sidebarProps = { workspace, user, workspaces, shortcuts, inboxUnread };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r transition-[width] duration-150 lg:block",
          collapsed ? "w-14" : "w-[232px]",
        )}
      >
        <Sidebar
          {...sidebarProps}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-12 items-center gap-2 border-b px-3 lg:hidden">
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

        <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
