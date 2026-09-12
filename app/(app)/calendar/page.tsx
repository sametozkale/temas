import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Calendar03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export default async function CalendarPage() {
  const t = await getTranslations("calendar");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        icon={Calendar03Icon}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    </div>
  );
}
