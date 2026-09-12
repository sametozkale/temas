import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Building03Icon, Icon, PlusSignIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default async function PropertiesPage() {
  const t = await getTranslations("properties");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button size="sm" disabled>
            <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
            {t("new")}
          </Button>
        }
      />
      <EmptyState
        icon={Building03Icon}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    </div>
  );
}
