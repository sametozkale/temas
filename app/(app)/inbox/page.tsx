import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { InboxIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default async function InboxPage() {
  const t = await getTranslations("inbox");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        icon={InboxIcon}
        title={t("empty_title")}
        description={t("empty_description")}
        action={
          <Button variant="ghost" size="sm" disabled>
            {t("connect")}
          </Button>
        }
      />
    </div>
  );
}
