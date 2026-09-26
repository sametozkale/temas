import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GmailMark, WhatsAppMark } from "@/components/brands";
import { ConversationList } from "@/components/inbox/conversation-list";
import { InboxListPane } from "@/components/inbox/inbox-list-pane";
import { InboxListHeader } from "@/components/inbox/inbox-list-header";
import { InboxOlderMail } from "@/components/inbox/inbox-older-mail";
import { Icon, InboxIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ConversationListItem } from "@/components/inbox/conversation-list";

export async function InboxSplit({
  items,
  selectedId,
  toolbar,
  search = "",
  hasOlder = false,
  canCompose = false,
  children,
}: {
  items: ConversationListItem[];
  selectedId?: string;
  toolbar?: React.ReactNode;
  search?: string;
  hasOlder?: boolean;
  canCompose?: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations("inbox");

  return (
    <div className="grid h-full min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-0 flex-col md:border-r",
          selectedId || items.length === 0 ? "hidden md:flex" : "flex",
        )}
      >
        <InboxListHeader toolbar={toolbar} canCompose={canCompose} />
        <InboxListPane>
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-muted-foreground">{t("empty_list")}</p>
            </div>
          ) : (
            <ConversationList
              items={items}
              selectedId={selectedId}
              search={search}
            />
          )}
          <InboxOlderMail hasMore={hasOlder} />
        </InboxListPane>
      </aside>
      <section
        className={cn(
          "min-h-0 min-w-0 flex-col overflow-hidden",
          selectedId || items.length === 0 ? "flex" : "hidden md:flex",
        )}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </section>
    </div>
  );
}

export function InboxDetailEmpty({
  label,
  composeHref,
  composeLabel,
}: {
  label: string;
  composeHref?: string;
  composeLabel?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon icon={InboxIcon} size={32} className="text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{label}</p>
      {composeHref && composeLabel ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={composeHref}>{composeLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function InboxConnectEmpty({
  title,
  description,
  gmailLabel,
  whatsappLabel,
  showGmail,
  showWhatsapp,
}: {
  title: string;
  description: string;
  gmailLabel: string;
  whatsappLabel: string;
  showGmail: boolean;
  showWhatsapp: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <Icon icon={InboxIcon} size={48} className="text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      {showGmail || showWhatsapp ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {showGmail ? (
            <Button variant="outline" asChild>
              <Link href="/settings/integrations/gmail">
                <GmailMark className="size-4" />
                {gmailLabel}
              </Link>
            </Button>
          ) : null}
          {showWhatsapp ? (
            <Button variant="outline" asChild>
              <Link href="/settings/integrations/whatsapp">
                <WhatsAppMark className="size-4" />
                {whatsappLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
