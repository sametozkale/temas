"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { signOut, switchWorkspace } from "@/app/(auth)/actions";
import { Icon, Logout01Icon, Tick02Icon } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type UserMenuWorkspace = { id: string; name: string; role: string };

type Props = {
  user: { name: string; email?: string; initials: string };
  workspaces?: UserMenuWorkspace[];
  activeWorkspaceId?: string;
  collapsed?: boolean;
};

export function UserMenu({
  user,
  workspaces = [],
  activeWorkspaceId,
  collapsed,
}: Props) {
  const t = useTranslations("nav");
  const [pending, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-sidebar-accent/60 aria-expanded:bg-sidebar-accent",
            collapsed && "justify-center px-0",
          )}
          aria-label={user.name}
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{user.name}</p>
              {user.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              ) : null}
            </div>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        {workspaces.length > 1 ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("workspaces")}
            </DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                disabled={pending}
                onSelect={() => startTransition(() => switchWorkspace(ws.id))}
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === activeWorkspaceId ? (
                  <Icon icon={Tick02Icon} size={16} className="ml-auto" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          disabled={pending}
          onSelect={() => startTransition(() => signOut())}
        >
          <Icon icon={Logout01Icon} size={16} />
          {t("sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
