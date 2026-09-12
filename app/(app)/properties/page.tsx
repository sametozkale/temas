import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Building03Icon, Icon, PlusSignIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import {
  PropertiesToolbar,
  type PropertiesView,
} from "@/components/properties/properties-toolbar";
import {
  PropertyGrid,
  PropertyTable,
  type PropertyListItem,
} from "@/components/properties/property-list";
import { Button } from "@/components/ui/button";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type PropertyStatus,
  type PropertyType,
} from "@/lib/db/schema/properties";
import { can } from "@/lib/permissions";
import { listProperties } from "@/lib/properties/queries";
import { STORAGE_BUCKETS, createSignedDownloads } from "@/lib/storage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getAppContext();
  const t = await getTranslations("properties");
  const sp = await searchParams;

  const q = first(sp.q)?.trim() || undefined;
  const typeParam = first(sp.type);
  const type = (PROPERTY_TYPES as readonly string[]).includes(typeParam ?? "")
    ? (typeParam as PropertyType)
    : undefined;
  const statusParam = first(sp.status);
  const status =
    statusParam === "listed" ||
    (PROPERTY_STATUSES as readonly string[]).includes(statusParam ?? "")
      ? (statusParam as PropertyStatus | "listed")
      : undefined;
  const view: PropertiesView = first(sp.view) === "list" ? "list" : "grid";
  const hasFilters = Boolean(q || type || status);

  const rows = await withUserContext(ctx.user.id, (tx) =>
    listProperties(tx, ctx.workspace.id, { q, type, status }),
  );
  const covers = await createSignedDownloads(
    STORAGE_BUCKETS.media,
    rows.map((r) => r.coverPath).filter((p): p is string => Boolean(p)),
  );
  const items: PropertyListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    address: r.address,
    rentAmount: r.rentAmount,
    currency: r.currency,
    areaM2: r.areaM2,
    rooms: r.rooms,
    updatedAt: r.updatedAt,
    coverUrl: r.coverPath ? (covers.get(r.coverPath) ?? null) : null,
  }));

  const canWrite = can(ctx.membership.role, "properties.write");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          items.length > 0
            ? t("count", { count: items.length })
            : t("description")
        }
        actions={
          canWrite ? (
            <Button size="sm" asChild>
              <Link href="/properties/new">
                <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
                {t("new")}
              </Link>
            </Button>
          ) : null
        }
      />

      <PropertiesToolbar view={view} hasFilters={hasFilters} />

      {items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Building03Icon}
            title={t("no_results_title")}
            description={t("no_results_description")}
          />
        ) : (
          <EmptyState
            icon={Building03Icon}
            title={t("empty_title")}
            description={t("empty_description")}
            action={
              canWrite ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/properties/new">{t("new")}</Link>
                </Button>
              ) : undefined
            }
          />
        )
      ) : view === "list" ? (
        <PropertyTable items={items} />
      ) : (
        <PropertyGrid items={items} />
      )}
    </div>
  );
}
