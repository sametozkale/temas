import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Settings02Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        icon={Settings02Icon}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    </div>
  );
}
