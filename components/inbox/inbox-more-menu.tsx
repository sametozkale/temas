"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Icon, Link01Icon, MoreHorizontalIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InboxMoreMenu() {
  const t = useTranslations("inbox");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("more")}
          className="text-muted-foreground"
        >
          <Icon icon={MoreHorizontalIcon} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/settings/integrations">
            <Icon icon={Link01Icon} size={16} />
            {t("connect")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
