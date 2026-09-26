import { DetailScrollRegion } from "@/components/properties/detail-scroll-region";
import {
  PropertyRecordRail,
  type PropertyRailValues,
} from "@/components/properties/property-record-header";
import { PropertyTabs } from "@/components/properties/property-tabs";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getPropertyTabMeta } from "@/lib/properties/queries";
import { STORAGE_BUCKETS, createSignedDownloads } from "@/lib/storage";

import { loadProperty } from "../../load";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const meta = await withUserContext(ctx.user.id, (tx) =>
    getPropertyTabMeta(tx, property.id, property.coverMediaId),
  );
  const covers = meta.coverPath
    ? await createSignedDownloads(STORAGE_BUCKETS.media, [meta.coverPath])
    : null;
  const coverUrl = meta.coverPath
    ? (covers?.get(meta.coverPath) ?? null)
    : null;

  const address = property.address ?? {};
  const rail: PropertyRailValues = {
    title: property.title,
    description: property.description ?? "",
    addressLine: address.line ?? "",
    district: address.district ?? "",
    city: address.city ?? "",
    country: address.country ?? "",
    type: property.type,
    timezone: property.timezone,
    currency: property.currency,
    rentAmount: property.rentAmount ?? "",
    depositAmount: property.depositAmount ?? "",
    duesAmount: property.duesAmount ?? "",
    areaM2: property.areaM2 ?? "",
    rooms: property.rooms ?? "",
    bedrooms: property.bedrooms != null ? String(property.bedrooms) : "",
    bathrooms: property.bathrooms != null ? String(property.bathrooms) : "",
    floor: property.floor != null ? String(property.floor) : "",
    totalFloors:
      property.totalFloors != null ? String(property.totalFloors) : "",
    yearBuilt: property.yearBuilt != null ? String(property.yearBuilt) : "",
    condition: property.condition ?? "",
    availableFrom: property.availableFrom ?? "",
    status: property.status,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="flex shrink-0 flex-col border-b border-foreground/6 lg:min-h-0 lg:w-[340px] lg:border-r lg:border-b-0">
          <DetailScrollRegion>
            <PropertyRecordRail
              propertyId={property.id}
              coverUrl={coverUrl}
              values={rail}
              canWrite={can(ctx.membership.role, "properties.write")}
            />
          </DetailScrollRegion>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PropertyTabs
            propertyId={property.id}
            counts={{
              viewings: meta.viewings,
              pipeline: meta.applications,
              inventory: meta.inventory,
            }}
          />
          <DetailScrollRegion className="@container">
            {children}
          </DetailScrollRegion>
        </div>
    </div>
  );
}
