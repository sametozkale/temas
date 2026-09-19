import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowLeft01Icon, Icon, Share08Icon } from "@/components/icons";
import { PropertyHeaderActions } from "@/components/properties/property-header-actions";
import { PropertyRecordHeader } from "@/components/properties/property-record-header";
import { PropertyTabs } from "@/components/properties/property-tabs";
import { Button } from "@/components/ui/button";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getPropertyTabMeta } from "@/lib/properties/queries";
import { STORAGE_BUCKETS, createSignedDownloads } from "@/lib/storage";

import { loadProperty } from "../load";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ ctx, property }, t] = await Promise.all([
    loadProperty(id),
    getTranslations("properties"),
  ]);
  const meta = await withUserContext(ctx.user.id, (tx) =>
    getPropertyTabMeta(tx, property.id, property.coverMediaId),
  );
  const covers = meta.coverPath
    ? await createSignedDownloads(STORAGE_BUCKETS.media, [meta.coverPath])
    : null;
  const coverUrl = meta.coverPath
    ? (covers?.get(meta.coverPath) ?? null)
    : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon icon={ArrowLeft01Icon} size={16} />
          {t("title")}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/properties/${property.id}/map`}>
              <Icon icon={Share08Icon} size={16} data-icon="inline-start" />
              {t("detail.map")}
            </Link>
          </Button>
          <PropertyHeaderActions
            propertyId={property.id}
            status={property.status}
            canWrite={can(ctx.membership.role, "properties.write")}
            canDelete={can(ctx.membership.role, "properties.delete")}
          />
        </div>
      </div>
      <div className="shrink-0">
        <PropertyRecordHeader
          property={property}
          coverUrl={coverUrl}
          labels={{
            perMonth: t("overview.per_month"),
            floor: t("overview.floor"),
          }}
        />
      </div>
      <PropertyTabs
        propertyId={property.id}
        counts={{
          viewings: meta.viewings,
          applications: meta.applications,
          people: meta.people,
          files: meta.files,
          inventory: meta.inventory,
        }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
        {children}
      </div>
    </div>
  );
}
