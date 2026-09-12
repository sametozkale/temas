import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Building03Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default async function PropertyNotFound() {
  const t = await getTranslations("properties.detail");
  return (
    <EmptyState
      icon={Building03Icon}
      title={t("not_found_title")}
      description={t("not_found_description")}
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">{t("back")}</Link>
        </Button>
      }
    />
  );
}
