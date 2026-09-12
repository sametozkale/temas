import { getTranslations } from "next-intl/server";

import { InboxSplit } from "@/components/inbox/inbox-split";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { listConversations } from "@/lib/inbox/queries";

export default async function InboxPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("inbox");
  const items = await withUserContext(ctx.user.id, (tx) =>
    listConversations(tx, ctx.workspace.id),
  );

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <PageHeader
        className="pb-4"
        title={t("title")}
        description={t("description")}
      />
      <InboxSplit items={items}>
        <div className="flex h-full items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">{t("select_thread")}</p>
        </div>
      </InboxSplit>
    </div>
  );
}
