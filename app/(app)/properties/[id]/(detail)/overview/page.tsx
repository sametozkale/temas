import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Icon, Image02Icon } from "@/components/icons";
import { PropertyStatusBadge } from "@/components/properties/property-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withUserContext } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listMedia } from "@/lib/properties/queries";
import { FEATURE_KEYS } from "@/lib/properties/schema";
import { STATUS_ORDER } from "@/lib/properties/status";
import { STORAGE_BUCKETS, createSignedDownloads } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { loadProperty } from "../../load";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const t = await getTranslations("properties");
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
  const facts: { label: string; value: string | null }[] = [
    {
      label: t("overview.rent"),
      value: formatMoney(property.rentAmount, property.currency),
    },
    {
      label: t("overview.deposit"),
      value: formatMoney(property.depositAmount, property.currency),
    },
    {
      label: t("overview.area"),
      value: property.areaM2 ? `${formatNumber(property.areaM2)} m²` : null,
    },
    { label: t("overview.rooms"), value: property.rooms },
    {
      label: t("overview.floor"),
      value: property.floor !== null ? String(property.floor) : null,
    },
    { label: t("overview.type"), value: t(`types.${property.type}`) },
    { label: t("overview.timezone"), value: property.timezone },
  ];

  const currentIndex = STATUS_ORDER.indexOf(property.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("overview.photos")}</CardTitle>
            {canWrite ? (
              <Button variant="soft" size="xs" asChild>
                <Link href={`/properties/${id}/edit#photos`}>
                  {t("overview.add_photos")}
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <div className="flex aspect-[16/7] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Icon icon={Image02Icon} size={16} />
                  {t("overview.no_photos")}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 5).map((p, i) => (
                  <div
                    key={p.id}
                    className={cn(
                      "relative overflow-hidden rounded-lg bg-secondary",
                      i === 0
                        ? "col-span-4 aspect-[16/8] sm:col-span-2 sm:row-span-2 sm:aspect-auto"
                        : "aspect-[4/3]",
                    )}
                  >
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL
                      <img
                        src={p.url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("overview.facts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                >
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {f.value ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("overview.lifecycle")}</CardTitle>
            <PropertyStatusBadge status={property.status} />
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5">
              {STATUS_ORDER.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    i === currentIndex
                      ? "font-medium text-foreground"
                      : i < currentIndex
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      i === currentIndex
                        ? "bg-brand"
                        : i < currentIndex
                          ? "bg-foreground/40"
                          : "bg-border",
                    )}
                  />
                  {t(`status.${s}`)}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
