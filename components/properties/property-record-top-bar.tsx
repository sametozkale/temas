import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowLeft01Icon, Icon, Share08Icon } from "@/components/icons";
import { PropertyHeaderActions } from "@/components/properties/property-header-actions";
import { Button } from "@/components/ui/button";
import type { PropertyStatus } from "@/lib/db/schema";

export async function PropertyRecordTopBar({
  propertyId,
  status,
  canWrite,
  canDelete,
}: {
  propertyId: string;
  status: PropertyStatus;
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
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/properties/${propertyId}/map`}>
            <Icon icon={Share08Icon} size={16} data-icon="inline-start" />
            {t("detail.map")}
          </Link>
        </Button>
        <PropertyHeaderActions
          propertyId={propertyId}
          status={status}
          canWrite={canWrite}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}
