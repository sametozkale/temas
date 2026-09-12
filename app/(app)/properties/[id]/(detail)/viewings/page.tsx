import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Calendar03Icon } from "@/components/icons";

import { loadProperty } from "../../load";

/** Stub until PHASE 3 (viewing calendar + slot engine). */
export default async function ViewingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await loadProperty(id);
  const t = await getTranslations("properties.viewings");
  return (
    <EmptyState
      icon={Calendar03Icon}
      title={t("empty_title")}
      description={t("empty_description")}
    />
  );
}
