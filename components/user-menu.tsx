"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { signOut } from "@/app/(auth)/actions";
import {
  Icon,
  Building03Icon,
  Logout01Icon,
  UserIcon,
} from "@/components/icons";
import { PersonAvatar } from "@/components/identity-marks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  user: {
    name: string;
    email?: string;
    initials: string;
    imageUrl?: string | null;
  };
  collapsed?: boolean;
};

export function UserMenu({ user, collapsed }: Props) {
  const t = useTranslations("nav");
  const [pending, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-md py-1 text-left transition-colors hover:bg-sidebar-accent/60 aria-expanded:bg-sidebar-accent",
            collapsed ? "w-fit px-0" : "w-full px-1.5",
          )}
          aria-label={user.name}
        >
          <PersonAvatar
            src={user.imageUrl}
            initials={user.initials}
            className="size-7"
            fallbackClassName="text-xs"
          />
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
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align="start"
        className="w-56"
      >
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Icon icon={UserIcon} size={16} />
            {t("profile_settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/workspace">
            <Icon icon={Building03Icon} size={16} />
            {t("workspace_settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          className="text-muted-foreground focus:text-accent-foreground"
          onSelect={() => startTransition(() => signOut())}
        >
          <Icon icon={Logout01Icon} size={16} />
          {t("sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
