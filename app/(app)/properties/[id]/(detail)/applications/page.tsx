import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { UserGroupIcon } from "@/components/icons";

import { loadProperty } from "../../load";

/** Stub until PHASE 4 (forms + pipeline). */
export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await loadProperty(id);
  const t = await getTranslations("properties.applications");
  return (
    <EmptyState
      icon={UserGroupIcon}
      title={t("empty_title")}
      description={t("empty_description")}
    />
  );
}
