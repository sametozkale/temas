"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { InboxMoreMenu } from "@/components/inbox/inbox-more-menu";
import {
  hydrateInboxSearch,
  readInboxSearch,
  setInboxSearch,
  subscribeInboxSearch,
} from "@/components/inbox/inbox-search";
import { Cancel01Icon, Icon, PencilEdit01Icon, Search01Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InboxListHeader({
  toolbar,
  canCompose = false,
}: {
  toolbar?: React.ReactNode;
  canCompose?: boolean;
}) {
  const t = useTranslations("inbox");
  const pathname = usePathname();
  const composing = pathname === "/inbox/new";
  const query = React.useSyncExternalStore(
    subscribeInboxSearch,
    readInboxSearch,
    () => "",
  );
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const focusOnOpen = React.useRef(false);
  const showField = open || query.trim().length > 0;

  React.useLayoutEffect(() => {
    hydrateInboxSearch();
  }, []);

  React.useEffect(() => {
    if (!showField || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    inputRef.current?.focus();
  }, [showField]);

  function openField() {
    focusOnOpen.current = true;
    setOpen(true);
  }

  function closeField() {
    setInboxSearch("");
    setOpen(false);
  }

  return (
    <header className="flex h-11 shrink-0 items-center gap-0.5 px-2">
      {showField ? (
        <Input
          ref={inputRef}
          size="sm"
          value={query}
          placeholder={t("search_placeholder")}
          aria-label={t("search")}
          className="min-w-0 flex-1"
          onChange={(event) => setInboxSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeField();
          }}
        />
      ) : (
        <h1 className="px-1.5 text-sm font-medium">{t("title")}</h1>
      )}
      <div className={cn("flex items-center gap-0.5", !showField && "ml-auto")}>
        {canCompose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className={cn(
              composing ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Link
              href="/inbox/new"
              scroll={false}
              aria-label={t("compose")}
              aria-current={composing ? "page" : undefined}
            >
              <Icon icon={PencilEdit01Icon} size={16} />
            </Link>
          </Button>
        ) : null}
        {showField ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("search_clear")}
            className="text-muted-foreground"
            onClick={closeField}
          >
            <Icon icon={Cancel01Icon} size={16} />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("search")}
            className="text-muted-foreground"
            onClick={openField}
          >
            <Icon icon={Search01Icon} size={16} />
          </Button>
        )}
        {toolbar}
        <InboxMoreMenu />
      </div>
    </header>
  );
}
