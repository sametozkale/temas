import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowLeft01Icon, Icon } from "@/components/icons";
import { PropertyHeaderActions } from "@/components/properties/property-header-actions";
import { PropertyViewSwitch } from "@/components/properties/property-view-switch";

export async function PropertyRecordTopBar({
  propertyId,
  canWrite,
  canDelete,
}: {
  propertyId: string;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const t = await getTranslations("properties");

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-foreground/6 px-4">
      <Link
        href="/properties"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
        {t("title")}
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <PropertyViewSwitch
          propertyId={propertyId}
          mapLabel={t("detail.map")}
          detailLabel={t("detail.detail_view")}
        />
        <PropertyHeaderActions
          propertyId={propertyId}
          canWrite={canWrite}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}
