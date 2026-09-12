import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConversationList } from "@/components/inbox/conversation-list";
import { EmptyState } from "@/components/empty-state";
import { InboxIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ConversationListItem } from "@/components/inbox/conversation-list";

export async function InboxSplit({
  items,
  selectedId,
  children,
}: {
  items: ConversationListItem[];
  selectedId?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("inbox");

  return (
    <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border md:grid-cols-[minmax(16rem,20rem)_1fr]">
      <aside
        className={cn(
          "min-h-0 overflow-y-auto md:border-r",
          selectedId ? "hidden md:block" : "block",
        )}
      >
        {items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={InboxIcon}
              title={t("empty_title")}
              description={t("empty_description")}
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings/integrations">{t("connect")}</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ConversationList items={items} selectedId={selectedId} />
        )}
      </aside>
      <section
        className={cn(
          "min-h-0 bg-card",
          selectedId ? "block" : "hidden md:block",
        )}
      >
        {children}
      </section>
    </div>
  );
}
