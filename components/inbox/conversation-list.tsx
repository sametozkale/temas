"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { GmailMark, WhatsAppMark } from "@/components/brands";
import {
  hydrateInboxSearch,
  readInboxSearch,
  subscribeInboxSearch,
} from "@/components/inbox/inbox-search";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { conversationMatchesSearch } from "@/lib/inbox/search";

export type ConversationListItem = {
  id: string;
  subject: string | null;
  channel: "email" | "whatsapp";
  isRead: boolean;
  lastMessageAt: Date | null;
  preview: string | null;
  contactName: string | null;
  contactEmail: string | null;
  propertyTitle: string | null;
  assignedAgentName?: string | null;
};

export function ConversationList({
  items,
  selectedId,
  search = "",
}: {
  items: ConversationListItem[];
  selectedId?: string;
  search?: string;
}) {
  const t = useTranslations("inbox");
  const query = React.useSyncExternalStore(
    subscribeInboxSearch,
    readInboxSearch,
    () => "",
  );
  React.useLayoutEffect(() => {
    hydrateInboxSearch();
  }, []);
  const visible = items.filter((item) =>
    conversationMatchesSearch(item, query),
  );
  const showChannel =
    new Set(items.map((item) => item.channel)).size > 1;

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty_list")}</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("search_empty")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-px px-2 pb-2">
      {visible.map((item) => {
        const active = item.id === selectedId;
        const title =
          item.contactName ?? item.contactEmail ?? t("unknown_contact");
        return (
          <li key={item.id}>
            <Link
              href={
                search ? `/inbox/${item.id}?${search}` : `/inbox/${item.id}`
              }
              scroll={false}
              className={cn(
                "group block rounded-md px-2.5 py-2 transition-colors hover:bg-muted/70",
                active && "bg-muted",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "min-w-0 truncate text-sm",
                    item.isRead ? "font-medium" : "font-semibold",
                  )}
                >
                  {title}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {showChannel ? (
                    <span
                      className="inline-flex"
                      aria-label={
                        item.channel === "whatsapp"
                          ? t("channel_whatsapp")
                          : t("channel_email")
                      }
                    >
                      {item.channel === "whatsapp" ? (
                        <WhatsAppMark className="size-3" />
                      ) : (
                        <GmailMark className="size-3" />
                      )}
                    </span>
                  ) : null}
                  {item.lastMessageAt ? (
                    <time
                      dateTime={item.lastMessageAt.toISOString()}
                      className="hidden text-[11px] text-muted-foreground group-hover:inline group-focus-visible:inline"
                    >
                      {formatRelative(item.lastMessageAt)}
                    </time>
                  ) : null}
                </div>
              </div>
              {item.channel === "email" && item.subject ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.subject}
                </p>
              ) : null}
              {item.channel !== "email" && item.preview ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.preview}
                </p>
              ) : null}
              {item.propertyTitle ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.propertyTitle}
                  {item.assignedAgentName ? ` · ${item.assignedAgentName}` : ""}
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
