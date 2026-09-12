import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowLeft01Icon, Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { MediaManager } from "@/components/properties/media-manager";
import { PropertyForm } from "@/components/properties/property-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withUserContext } from "@/lib/db";
import { requireAbility } from "@/lib/permissions";
import { listMedia } from "@/lib/properties/queries";
import { propertyToFormInput } from "@/lib/properties/schema";
import { STORAGE_BUCKETS, createSignedDownloads } from "@/lib/storage";

import { loadProperty } from "../load";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  requireAbility(ctx.membership, "properties.write");
  const t = await getTranslations("properties.form");

  const media = await withUserContext(ctx.user.id, (tx) => listMedia(tx, id));
  const urls = await createSignedDownloads(
    STORAGE_BUCKETS.media,
    media.map((m) => m.storagePath),
  );
  const items = media.map((m) => ({
    id: m.id,
    url: urls.get(m.storagePath) ?? null,
    isCover: m.id === property.coverMediaId,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-4">
        <Link
          href={`/properties/${id}/overview`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon icon={ArrowLeft01Icon} size={16} />
          {property.title}
        </Link>
        <PageHeader
          title={t("edit_title")}
          description={t("edit_description")}
          className="pb-0"
        />
      </div>

      <Card id="photos">
        <CardHeader>
          <CardTitle>{t("section_photos")}</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaManager propertyId={id} items={items} canEdit />
        </CardContent>
      </Card>

      <PropertyForm
        mode="edit"
        propertyId={id}
        defaultValues={propertyToFormInput(property)}
        cancelHref={`/properties/${id}/overview`}
      />
    </div>
  );
}
