import { getTranslations } from "next-intl/server";

import { PropertyPhotosCard } from "@/components/properties/property-photos-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { listMedia } from "@/lib/properties/queries";
import { FEATURE_KEYS } from "@/lib/properties/schema";
import { STORAGE_BUCKETS, createSignedDownloads } from "@/lib/storage";

import { loadProperty } from "../../../load";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ ctx, property }, t] = await Promise.all([
    loadProperty(id),
    getTranslations("properties"),
  ]);
  const canWrite = can(ctx.membership.role, "properties.write");

  const media = await withUserContext(ctx.user.id, (tx) => listMedia(tx, id));
  const urls = await createSignedDownloads(
    STORAGE_BUCKETS.media,
    media.map((m) => m.storagePath),
  );
  const photos = media
    .filter((m) => m.kind === "photo")
    .map((m) => ({
      id: m.id,
      url: urls.get(m.storagePath) ?? null,
      isCover: m.id === property.coverMediaId,
    }))
    .sort((a, b) => Number(b.isCover) - Number(a.isCover));

  const features = FEATURE_KEYS.filter((k) => property.features?.[k] === true);

  return (
    <div className="space-y-6">
      <PropertyPhotosCard
        propertyId={id}
        items={photos}
        canEdit={canWrite}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("overview.description")}</CardTitle>
        </CardHeader>
        <CardContent>
          {property.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("overview.no_description")}
            </p>
          )}
          {features.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {features.map((f) => (
                <Badge key={f} variant="secondary">
                  {t(`features.${f}`)}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
