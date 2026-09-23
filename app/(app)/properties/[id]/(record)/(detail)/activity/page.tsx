import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Activity01Icon } from "@/components/icons";
import { PropertyActivityFeed } from "@/components/properties/property-activity-feed";
import { withUserContext } from "@/lib/db";
import { listActivity } from "@/lib/properties/queries";

import { loadProperty } from "../../../load";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const t = await getTranslations("properties.activity");

  const rows = await withUserContext(ctx.user.id, (tx) => listActivity(tx, id));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Activity01Icon}
        title={t("empty_title")}
        description={t("description")}
      />
    );
  }

  return (
    <PropertyActivityFeed rows={rows} timezone={property.timezone} />
  );
}
