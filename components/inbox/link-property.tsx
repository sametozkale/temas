"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { linkConversationToProperty } from "@/app/(app)/inbox/actions";
import { Building03Icon, Icon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Thread header listing chip; opens a picker to link or unlink the listing. */
export function LinkProperty({
  conversationId,
  propertyId,
  propertyTitle,
  properties,
}: {
  conversationId: string;
  propertyId: string | null;
  propertyTitle: string | null;
  properties: { id: string; title: string }[];
}) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function link(next: string | null) {
    startTransition(async () => {
      const res = await linkConversationToProperty({
        conversationId,
        propertyId: next,
      });
      if (!res.ok) {
        toast.error(t("errors.link_failed"));
        return;
      }
      toast.success(next ? t("linked") : t("unlinked"));
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="inline-flex h-7 max-w-[40%] shrink-0 items-center gap-1.5 truncate rounded-full px-2.5 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon icon={Building03Icon} size={16} className="size-3.5" />
        <span className="truncate">{propertyTitle ?? t("link_listing")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
        {propertyId ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/properties/${propertyId}`}>{t("open_listing")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => link(null)}>
              {t("unlink_listing")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("link_to")}
        </DropdownMenuLabel>
        {properties.filter((p) => p.id !== propertyId).length === 0 ? (
          <DropdownMenuItem disabled>{t("no_listings")}</DropdownMenuItem>
        ) : (
          properties
            .filter((p) => p.id !== propertyId)
            .map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => link(p.id)}>
                <span className="truncate">{p.title}</span>
              </DropdownMenuItem>
            ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
