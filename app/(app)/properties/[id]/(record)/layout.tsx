import { PropertyRecordTopBar } from "@/components/properties/property-record-top-bar";
import { can } from "@/lib/permissions";

import { loadProperty } from "../load";

export default async function PropertyRecordLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PropertyRecordTopBar
        propertyId={property.id}
        status={property.status}
        canWrite={can(ctx.membership.role, "properties.write")}
        canDelete={can(ctx.membership.role, "properties.delete")}
      />
      {children}
    </div>
  );
}
