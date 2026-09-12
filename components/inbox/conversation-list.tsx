import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

export type ConversationListItem = {
  id: string;
  subject: string | null;
  isRead: boolean;
  lastMessageAt: Date | null;
  preview: string | null;
  contactName: string | null;
  contactEmail: string | null;
  propertyTitle: string | null;
};

export async function ConversationList({
  items,
  selectedId,
}: {
  items: ConversationListItem[];
  selectedId?: string;
}) {
  const t = await getTranslations("inbox");

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty_list")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((item) => {
        const active = item.id === selectedId;
        const title =
          item.contactName ?? item.contactEmail ?? t("unknown_contact");
        return (
          <li key={item.id}>
            <Link
              href={`/inbox/${item.id}`}
              className={cn(
                "block px-4 py-3 transition-colors hover:bg-muted/60",
                active && "bg-muted",
                !item.isRead && "bg-brand-soft/40",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={cn(
                    "truncate text-sm",
                    item.isRead ? "font-medium" : "font-semibold",
                  )}
                >
                  {title}
                </p>
                {item.lastMessageAt ? (
                  <time
                    dateTime={item.lastMessageAt.toISOString()}
                    className="shrink-0 text-[11px] text-muted-foreground"
                  >
                    {formatRelative(item.lastMessageAt)}
                  </time>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {item.subject ?? t("no_subject")}
              </p>
              {item.preview ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.preview}
                </p>
              ) : null}
              {item.propertyTitle ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.propertyTitle}
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
