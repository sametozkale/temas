import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowLeft01Icon, Icon, Location01Icon } from "@/components/icons";
import {
  PropertyStatusBadge,
  PropertyTypeLabel,
} from "@/components/properties/property-badges";
import { PropertyHeaderActions } from "@/components/properties/property-header-actions";
import { PropertyTabs } from "@/components/properties/property-tabs";
import { formatAddress, formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";

import { loadProperty } from "../load";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const t = await getTranslations("properties");
  const rent = formatMoney(property.rentAmount, property.currency);
  const address = formatAddress(property.address);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon icon={ArrowLeft01Icon} size={16} />
          {t("title")}
        </Link>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-3xl font-medium tracking-tight">
                {property.title}
              </h1>
              <PropertyStatusBadge status={property.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <PropertyTypeLabel type={property.type} />
              {address ? (
                <span className="inline-flex items-center gap-1">
                  <Icon icon={Location01Icon} size={16} />
                  {address}
                </span>
              ) : null}
              {rent ? (
                <span className="font-medium text-foreground">
                  {rent}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    {t("overview.per_month")}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PropertyHeaderActions
              propertyId={property.id}
              status={property.status}
              canWrite={can(ctx.membership.role, "properties.write")}
              canDelete={can(ctx.membership.role, "properties.delete")}
            />
          </div>
        </header>
        <PropertyTabs propertyId={property.id} />
      </div>
      {children}
    </div>
  );
}
